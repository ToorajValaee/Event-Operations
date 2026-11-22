import pg from 'pg';
import fs from 'fs';
import path from 'path';
import type {
  User,
  EventItem,
  VendorRegistration,
  VendorReview,
  SponsorItem,
  SponsorStatus,
  BoothTypeOption,
} from '../src/types.js';

const { Pool } = pg;

interface LocalDataStore {
  users: User[];
  events: EventItem[];
  vendors: VendorRegistration[];
  sponsors: SponsorItem[];
  reviews: VendorReview[];
}

class DatabaseService {
  private pool: pg.Pool | null = null;
  public isPostgresConnected = false;

  // In-memory cache / local state
  private memoryUsers: Map<string, User> = new Map();
  private memoryEvents: Map<string, EventItem> = new Map();
  private memoryVendors: Map<string, VendorRegistration> = new Map();
  private memoryReviews: Map<string, VendorReview> = new Map();
  private memorySponsors: Map<string, SponsorItem> = new Map();
  private memoryOtp: Map<string, { code: string; expiresAt: number }> = new Map();

  private localDataFilePath = path.join(process.cwd(), 'data', 'eventops_data.json');

  constructor() {
    this.initLocalStore();
    this.initPostgres();
  }

  // Load from local storage file if exists (no mock data inserted)
  private initLocalStore() {
    try {
      const dataDir = path.dirname(this.localDataFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.localDataFilePath)) {
        const raw = fs.readFileSync(this.localDataFilePath, 'utf-8');
        const data: LocalDataStore = JSON.parse(raw);
        if (Array.isArray(data.users)) {
          data.users.forEach((u) => {
            this.memoryUsers.set(u.id, u);
            this.memoryUsers.set(u.phone, u);
          });
        }
        if (Array.isArray(data.events)) {
          data.events.forEach((e) => this.memoryEvents.set(e.id, e));
        }
        if (Array.isArray(data.vendors)) {
          data.vendors.forEach((v) => this.memoryVendors.set(v.id, v));
        }
        if (Array.isArray(data.sponsors)) {
          data.sponsors.forEach((s) => this.memorySponsors.set(s.id, s));
        }
        if (Array.isArray(data.reviews)) {
          data.reviews.forEach((r) => this.memoryReviews.set(r.id, r));
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not load local data file:', (err as Error).message);
    }
  }

  private saveToLocalStore() {
    try {
      const uniqueUsers = new Map<string, User>();
      for (const u of this.memoryUsers.values()) {
        uniqueUsers.set(u.id, u);
      }

      const store: LocalDataStore = {
        users: Array.from(uniqueUsers.values()),
        events: Array.from(this.memoryEvents.values()),
        vendors: Array.from(this.memoryVendors.values()),
        sponsors: Array.from(this.memorySponsors.values()),
        reviews: Array.from(this.memoryReviews.values()),
      };

      const dataDir = path.dirname(this.localDataFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.localDataFilePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
      console.warn('⚠️ Could not save to local data file:', (err as Error).message);
    }
  }

  private async initPostgres() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.log('ℹ️ DATABASE_URL not configured - running with persistent JSON data storage (NO mock data)');
      this.ensureAdminPhones();
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pool.connect();
      this.isPostgresConnected = true;
      console.log('✅ Connected to PostgreSQL database successfully');

      // Create production tables if not exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          phone VARCHAR(20) UNIQUE NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS events (
          id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          shamsi_start_date VARCHAR(20) NOT NULL,
          duration_days INT NOT NULL,
          location TEXT NOT NULL,
          description TEXT,
          banner_url TEXT,
          gallery JSONB DEFAULT '[]',
          max_booths INT DEFAULT 50,
          booth_price VARCHAR(100),
          rules_and_instructions TEXT,
          contract_template_text TEXT,
          booth_locations JSONB DEFAULT '[]',
          booth_types JSONB DEFAULT '[]',
          booth_requirements JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS vendor_registrations (
          id VARCHAR(64) PRIMARY KEY,
          event_id VARCHAR(64) REFERENCES events(id) ON DELETE CASCADE,
          user_id VARCHAR(64),
          brand_name VARCHAR(255) NOT NULL,
          guild_group VARCHAR(100) NOT NULL,
          description TEXT,
          phone VARCHAR(20),
          email VARCHAR(100),
          website VARCHAR(255),
          logo_url TEXT,
          has_logo BOOLEAN DEFAULT FALSE,
          documents JSONB DEFAULT '[]',
          booth_type VARCHAR(50) DEFAULT 'standard',
          selected_location TEXT DEFAULT '',
          requested_facilities JSONB DEFAULT '[]',
          assigned_booth_number VARCHAR(100) DEFAULT '',
          is_contract_signed BOOLEAN DEFAULT FALSE,
          signed_by VARCHAR(255) DEFAULT '',
          signed_at VARCHAR(100) DEFAULT '',
          status VARCHAR(30) DEFAULT 'pending',
          admin_notes TEXT,
          rating_average NUMERIC(3,2) DEFAULT 5.0,
          rating_count INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sponsors (
          id VARCHAR(64) PRIMARY KEY,
          event_id VARCHAR(64),
          event_title VARCHAR(255),
          company_name VARCHAR(255) NOT NULL,
          brand_name VARCHAR(255) NOT NULL,
          contact_person VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(100),
          website VARCHAR(255),
          logo_url TEXT,
          tier VARCHAR(30) DEFAULT 'silver',
          budget_proposal TEXT,
          message TEXT,
          status VARCHAR(30) DEFAULT 'pending',
          admin_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id VARCHAR(64) PRIMARY KEY,
          vendor_registration_id VARCHAR(64) REFERENCES vendor_registrations(id) ON DELETE CASCADE,
          event_id VARCHAR(64),
          reviewer_name VARCHAR(100),
          stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
          comment TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Safe schema migrations for any existing tables
      await client.query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]';
        ALTER TABLE events ADD COLUMN IF NOT EXISTS booth_locations JSONB DEFAULT '[]';
        ALTER TABLE events ADD COLUMN IF NOT EXISTS booth_types JSONB DEFAULT '[]';
        ALTER TABLE events ADD COLUMN IF NOT EXISTS booth_requirements JSONB DEFAULT '[]';

        ALTER TABLE vendor_registrations ADD COLUMN IF NOT EXISTS has_logo BOOLEAN DEFAULT FALSE;
        ALTER TABLE vendor_registrations ADD COLUMN IF NOT EXISTS selected_location TEXT DEFAULT '';
        ALTER TABLE vendor_registrations ADD COLUMN IF NOT EXISTS is_contract_signed BOOLEAN DEFAULT FALSE;
        ALTER TABLE vendor_registrations ADD COLUMN IF NOT EXISTS signed_by VARCHAR(255) DEFAULT '';
        ALTER TABLE vendor_registrations ADD COLUMN IF NOT EXISTS signed_at VARCHAR(100) DEFAULT '';
      `);

      client.release();

      // Ensure any admin phone numbers from environment are registered
      await this.ensureAdminPhones();
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed, operating with local JSON storage:', (err as Error).message);
      this.isPostgresConnected = false;
      this.ensureAdminPhones();
    }
  }

  // Register configured admin phones from process.env.ADMIN_PHONES
  private async ensureAdminPhones() {
    const raw = process.env.ADMIN_PHONES || '';
    const phones = raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 5);

    for (const phone of phones) {
      const existing = await this.getUserByPhone(phone);
      if (!existing) {
        const adminUser: User = {
          id: `usr-admin-${phone}`,
          phone,
          fullName: 'مدیر سامانه',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        await this.saveUser(adminUser);
      } else if (existing.role !== 'admin') {
        existing.role = 'admin';
        await this.saveUser(existing);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // JSON & Row Mappers
  // ---------------------------------------------------------------------------
  private parseJsonField<T>(val: unknown, fallback: T): T {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') return val as T;
    try {
      return JSON.parse(val as string) as T;
    } catch {
      return fallback;
    }
  }

  private mapEventRow(row: any, vendorCount?: number): EventItem {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      shamsiStartDate: row.shamsi_start_date,
      durationDays: Number(row.duration_days) || 1,
      location: row.location,
      description: row.description || '',
      bannerUrl: row.banner_url || '',
      gallery: this.parseJsonField<string[]>(row.gallery, []),
      maxBooths: Number(row.max_booths) || 50,
      boothPrice: row.booth_price || '',
      rulesAndInstructions: row.rules_and_instructions || '',
      contractTemplateText: row.contract_template_text || '',
      boothLocations: this.parseJsonField<string[]>(row.booth_locations, []),
      boothTypes: this.parseJsonField<BoothTypeOption[]>(row.booth_types, []),
      boothRequirements: this.parseJsonField<string[]>(row.booth_requirements, []),
      vendorCount: vendorCount !== undefined ? vendorCount : (Number(row.vendorCount) || 0),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  private mapVendorRow(row: any): VendorRegistration {
    const logoUrl = row.logo_url ? String(row.logo_url).trim() : '';
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      brandName: row.brand_name,
      guildGroup: row.guild_group,
      description: row.description || '',
      phone: row.phone || '',
      email: row.email || '',
      website: row.website || '',
      logoUrl,
      hasLogo: Boolean(row.has_logo || (logoUrl && logoUrl.length > 5)),
      documents: this.parseJsonField(row.documents, []),
      boothType: row.booth_type || 'standard',
      selectedLocation: row.selected_location || '',
      requestedFacilities: this.parseJsonField(row.requested_facilities, []),
      assignedBoothNumber: row.assigned_booth_number || '',
      isContractSigned: Boolean(row.is_contract_signed),
      signedBy: row.signed_by || '',
      signedAt: row.signed_at || '',
      status: row.status || 'pending',
      adminNotes: row.admin_notes || '',
      ratingAverage: Number(row.rating_average) || 5.0,
      ratingCount: Number(row.rating_count) || 0,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  private mapSponsorRow(row: any): SponsorItem {
    return {
      id: row.id,
      eventId: row.event_id || '',
      eventTitle: row.event_title || '',
      companyName: row.company_name,
      brandName: row.brand_name,
      contactPerson: row.contact_person,
      phone: row.phone,
      email: row.email || '',
      website: row.website || '',
      logoUrl: row.logo_url || '',
      tier: row.tier || 'silver',
      budgetProposal: row.budget_proposal || '',
      message: row.message || '',
      status: row.status || 'pending',
      adminNotes: row.admin_notes || '',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // USERS & AUTH
  // ---------------------------------------------------------------------------
  public async getUserByPhone(phone: string): Promise<User | null> {
    const cleanPhone = phone.trim();
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          `SELECT id, phone, full_name as "fullName", role, created_at as "createdAt"
           FROM users WHERE phone = $1 LIMIT 1`,
          [cleanPhone]
        );
        if (res.rows.length > 0) return res.rows[0];
      } catch (e) {
        console.error('Postgres error in getUserByPhone:', (e as Error).message);
      }
    }
    return this.memoryUsers.get(cleanPhone) || null;
  }

  public async getUserById(id: string): Promise<User | null> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          `SELECT id, phone, full_name as "fullName", role, created_at as "createdAt"
           FROM users WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) return res.rows[0];
      } catch (e) {
        console.error('Postgres error in getUserById:', (e as Error).message);
      }
    }
    return this.memoryUsers.get(id) || null;
  }

  public async saveUser(user: User): Promise<User> {
    this.memoryUsers.set(user.id, user);
    this.memoryUsers.set(user.phone, user);
    this.saveToLocalStore();

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO users (id, phone, full_name, role, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role`,
          [user.id, user.phone, user.fullName, user.role, user.createdAt]
        );
      } catch (e) {
        console.error('Postgres error in saveUser:', (e as Error).message);
      }
    }

    return user;
  }

  public async getAdminPhones(): Promise<string[]> {
    const envPhones = (process.env.ADMIN_PHONES || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT phone FROM users WHERE role = $1', ['admin']);
        const dbPhones = res.rows.map((r: { phone: string }) => r.phone).filter(Boolean);
        return Array.from(new Set([...dbPhones, ...envPhones]));
      } catch (e) {
        console.error('Postgres error in getAdminPhones:', (e as Error).message);
      }
    }

    const memoryPhones = Array.from(this.memoryUsers.values())
      .filter((u) => u.role === 'admin')
      .map((u) => u.phone)
      .filter(Boolean);

    return Array.from(new Set([...memoryPhones, ...envPhones]));
  }

  public async getAdminUsers(): Promise<User[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT id, phone, full_name as "fullName", role, created_at as "createdAt" FROM users WHERE role = $1 ORDER BY created_at ASC',
          ['admin']
        );
        if (res.rows.length > 0) return res.rows;
      } catch (e) {
        console.error('Postgres error in getAdminUsers:', (e as Error).message);
      }
    }

    const uniqueUsers = new Map<string, User>();
    for (const u of this.memoryUsers.values()) {
      if (u.role === 'admin') {
        uniqueUsers.set(u.phone, u);
      }
    }
    return Array.from(uniqueUsers.values());
  }

  public async deleteUser(id: string): Promise<boolean> {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
      } catch (e) {
        console.error('Postgres error in deleteUser:', (e as Error).message);
      }
    }

    let found = false;
    for (const [key, user] of this.memoryUsers.entries()) {
      if (user.id === id) {
        this.memoryUsers.delete(key);
        found = true;
      }
    }
    this.saveToLocalStore();
    return found;
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------
  public async getEvents(): Promise<EventItem[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(`
          SELECT e.*,
                 COUNT(v.id) FILTER (WHERE v.status = 'approved')::int as "vendorCount"
          FROM events e
          LEFT JOIN vendor_registrations v ON e.id = v.event_id
          GROUP BY e.id
          ORDER BY e.created_at DESC
        `);
        return res.rows.map((row: any) => this.mapEventRow(row));
      } catch (e) {
        console.error('Postgres error in getEvents:', (e as Error).message);
      }
    }

    // Local / Memory fallback
    const list = Array.from(this.memoryEvents.values());
    return list.map((ev) => {
      const vList = Array.from(this.memoryVendors.values()).filter(
        (v) => v.eventId === ev.id && v.status === 'approved'
      );
      return {
        ...ev,
        vendorCount: vList.length,
      };
    });
  }

  public async getEventById(id: string): Promise<EventItem | null> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          `SELECT e.*,
                  COUNT(v.id) FILTER (WHERE v.status = 'approved')::int as "vendorCount"
           FROM events e
           LEFT JOIN vendor_registrations v ON e.id = v.event_id
           WHERE e.id = $1
           GROUP BY e.id
           LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) {
          return this.mapEventRow(res.rows[0]);
        }
        return null;
      } catch (e) {
        console.error('Postgres error in getEventById:', (e as Error).message);
      }
    }

    const ev = this.memoryEvents.get(id);
    if (!ev) return null;
    const vList = Array.from(this.memoryVendors.values()).filter(
      (v) => v.eventId === ev.id && v.status === 'approved'
    );
    return {
      ...ev,
      vendorCount: vList.length,
    };
  }

  public async saveEvent(event: EventItem): Promise<EventItem> {
    this.memoryEvents.set(event.id, event);
    this.saveToLocalStore();

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO events (
            id, title, category, shamsi_start_date, duration_days, location, description, banner_url,
            gallery, max_booths, booth_price, rules_and_instructions, contract_template_text,
            booth_locations, booth_types, booth_requirements, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            shamsi_start_date = EXCLUDED.shamsi_start_date,
            duration_days = EXCLUDED.duration_days,
            location = EXCLUDED.location,
            description = EXCLUDED.description,
            banner_url = EXCLUDED.banner_url,
            gallery = EXCLUDED.gallery,
            max_booths = EXCLUDED.max_booths,
            booth_price = EXCLUDED.booth_price,
            rules_and_instructions = EXCLUDED.rules_and_instructions,
            contract_template_text = EXCLUDED.contract_template_text,
            booth_locations = EXCLUDED.booth_locations,
            booth_types = EXCLUDED.booth_types,
            booth_requirements = EXCLUDED.booth_requirements`,
          [
            event.id,
            event.title,
            event.category,
            event.shamsiStartDate,
            event.durationDays,
            event.location,
            event.description,
            event.bannerUrl || null,
            JSON.stringify(event.gallery || []),
            event.maxBooths,
            event.boothPrice || null,
            event.rulesAndInstructions || null,
            event.contractTemplateText || null,
            JSON.stringify(event.boothLocations || []),
            JSON.stringify(event.boothTypes || []),
            JSON.stringify(event.boothRequirements || []),
            event.createdAt || new Date().toISOString(),
          ]
        );
      } catch (e) {
        console.error('Postgres error in saveEvent:', (e as Error).message);
      }
    }

    return event;
  }

  public async updateEvent(id: string, updates: Partial<EventItem>): Promise<EventItem | null> {
    const existing = await this.getEventById(id);
    if (!existing) return null;

    const merged: EventItem = {
      ...existing,
      ...updates,
      id,
    };

    this.memoryEvents.set(id, merged);
    this.saveToLocalStore();

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE events SET
            title = $1,
            category = $2,
            shamsi_start_date = $3,
            duration_days = $4,
            location = $5,
            description = $6,
            banner_url = $7,
            gallery = $8,
            max_booths = $9,
            booth_price = $10,
            rules_and_instructions = $11,
            contract_template_text = $12,
            booth_locations = $13,
            booth_types = $14,
            booth_requirements = $15
           WHERE id = $16`,
          [
            merged.title,
            merged.category,
            merged.shamsiStartDate,
            merged.durationDays,
            merged.location,
            merged.description,
            merged.bannerUrl || null,
            JSON.stringify(merged.gallery || []),
            merged.maxBooths,
            merged.boothPrice || null,
            merged.rulesAndInstructions || null,
            merged.contractTemplateText || null,
            JSON.stringify(merged.boothLocations || []),
            JSON.stringify(merged.boothTypes || []),
            JSON.stringify(merged.boothRequirements || []),
            id,
          ]
        );
      } catch (e) {
        console.error('Postgres error in updateEvent:', (e as Error).message);
      }
    }

    return merged;
  }

  public async deleteEvent(id: string): Promise<boolean> {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM events WHERE id = $1', [id]);
      } catch (e) {
        console.error('Postgres error in deleteEvent:', (e as Error).message);
      }
    }
    const result = this.memoryEvents.delete(id);
    this.saveToLocalStore();
    return result;
  }

  // ---------------------------------------------------------------------------
  // VENDOR REGISTRATIONS
  // ---------------------------------------------------------------------------
  public async getVendors(eventId?: string): Promise<VendorRegistration[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const query = eventId
          ? 'SELECT * FROM vendor_registrations WHERE event_id = $1 ORDER BY created_at DESC'
          : 'SELECT * FROM vendor_registrations ORDER BY created_at DESC';
        const params = eventId ? [eventId] : [];
        const res = await this.pool.query(query, params);
        return res.rows.map((row: any) => this.mapVendorRow(row));
      } catch (e) {
        console.error('Postgres error in getVendors:', (e as Error).message);
      }
    }

    let list = Array.from(this.memoryVendors.values());
    if (eventId) {
      list = list.filter((v) => v.eventId === eventId);
    }
    return list.map((v) => ({
      ...v,
      hasLogo: Boolean(v.logoUrl && v.logoUrl.trim().length > 5),
      isContractSigned: Boolean(v.isContractSigned),
    }));
  }

  public async getVendorById(id: string): Promise<VendorRegistration | null> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM vendor_registrations WHERE id = $1 LIMIT 1', [id]);
        if (res.rows.length > 0) {
          return this.mapVendorRow(res.rows[0]);
        }
        return null;
      } catch (e) {
        console.error('Postgres error in getVendorById:', (e as Error).message);
      }
    }

    const v = this.memoryVendors.get(id);
    if (!v) return null;
    return {
      ...v,
      hasLogo: Boolean(v.logoUrl && v.logoUrl.trim().length > 5),
      isContractSigned: Boolean(v.isContractSigned),
    };
  }

  public async saveVendor(vendor: VendorRegistration): Promise<VendorRegistration> {
    const hasLogo = Boolean(vendor.logoUrl && vendor.logoUrl.trim().length > 5);
    const normalized: VendorRegistration = {
      ...vendor,
      hasLogo,
      isContractSigned: Boolean(vendor.isContractSigned),
    };

    this.memoryVendors.set(normalized.id, normalized);
    this.saveToLocalStore();

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO vendor_registrations (
            id, event_id, user_id, brand_name, guild_group, description, phone, email, website,
            logo_url, has_logo, documents, booth_type, selected_location, requested_facilities,
            assigned_booth_number, is_contract_signed, signed_by, signed_at, status, admin_notes,
            rating_average, rating_count, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            user_id = EXCLUDED.user_id,
            brand_name = EXCLUDED.brand_name,
            guild_group = EXCLUDED.guild_group,
            description = EXCLUDED.description,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            website = EXCLUDED.website,
            logo_url = EXCLUDED.logo_url,
            has_logo = EXCLUDED.has_logo,
            documents = EXCLUDED.documents,
            booth_type = EXCLUDED.booth_type,
            selected_location = EXCLUDED.selected_location,
            requested_facilities = EXCLUDED.requested_facilities,
            assigned_booth_number = EXCLUDED.assigned_booth_number,
            is_contract_signed = EXCLUDED.is_contract_signed,
            signed_by = EXCLUDED.signed_by,
            signed_at = EXCLUDED.signed_at,
            status = EXCLUDED.status,
            admin_notes = EXCLUDED.admin_notes,
            rating_average = EXCLUDED.rating_average,
            rating_count = EXCLUDED.rating_count,
            updated_at = NOW()`,
          [
            normalized.id,
            normalized.eventId,
            normalized.userId || null,
            normalized.brandName,
            normalized.guildGroup,
            normalized.description || null,
            normalized.phone || null,
            normalized.email || null,
            normalized.website || null,
            normalized.logoUrl || null,
            normalized.hasLogo,
            JSON.stringify(normalized.documents || []),
            normalized.boothType || 'standard',
            normalized.selectedLocation || '',
            JSON.stringify(normalized.requestedFacilities || []),
            normalized.assignedBoothNumber || '',
            normalized.isContractSigned,
            normalized.signedBy || '',
            normalized.signedAt || '',
            normalized.status || 'pending',
            normalized.adminNotes || '',
            normalized.ratingAverage || 5.0,
            normalized.ratingCount || 0,
            normalized.createdAt || new Date().toISOString(),
            normalized.updatedAt || new Date().toISOString(),
          ]
        );
      } catch (e) {
        console.error('Postgres error in saveVendor:', (e as Error).message);
      }
    }

    return normalized;
  }

  public async deleteVendor(id: string): Promise<boolean> {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM vendor_registrations WHERE id = $1', [id]);
      } catch (e) {
        console.error('Postgres error in deleteVendor:', (e as Error).message);
      }
    }
    const result = this.memoryVendors.delete(id);
    this.saveToLocalStore();
    return result;
  }

  // ---------------------------------------------------------------------------
  // SPONSORS
  // ---------------------------------------------------------------------------
  public async getSponsors(eventId?: string, onlyApproved = false): Promise<SponsorItem[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const conditions: string[] = [];
        const params: any[] = [];

        if (eventId) {
          params.push(eventId);
          conditions.push(`(event_id = $${params.length} OR event_id IS NULL OR event_id = '')`);
        }
        if (onlyApproved) {
          conditions.push(`status = 'approved'`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM sponsors ${where} ORDER BY created_at DESC`;
        const res = await this.pool.query(query, params);
        return res.rows.map((row: any) => this.mapSponsorRow(row));
      } catch (e) {
        console.error('Postgres error in getSponsors:', (e as Error).message);
      }
    }

    let list = Array.from(this.memorySponsors.values());
    if (eventId) {
      list = list.filter((s) => !s.eventId || s.eventId === eventId);
    }
    if (onlyApproved) {
      list = list.filter((s) => s.status === 'approved');
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getSponsorById(id: string): Promise<SponsorItem | null> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM sponsors WHERE id = $1 LIMIT 1', [id]);
        if (res.rows.length > 0) {
          return this.mapSponsorRow(res.rows[0]);
        }
        return null;
      } catch (e) {
        console.error('Postgres error in getSponsorById:', (e as Error).message);
      }
    }
    return this.memorySponsors.get(id) || null;
  }

  public async saveSponsor(sponsor: SponsorItem): Promise<SponsorItem> {
    this.memorySponsors.set(sponsor.id, sponsor);
    this.saveToLocalStore();

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO sponsors (
            id, event_id, event_title, company_name, brand_name, contact_person, phone, email,
            website, logo_url, tier, budget_proposal, message, status, admin_notes, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            event_title = EXCLUDED.event_title,
            company_name = EXCLUDED.company_name,
            brand_name = EXCLUDED.brand_name,
            contact_person = EXCLUDED.contact_person,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            website = EXCLUDED.website,
            logo_url = EXCLUDED.logo_url,
            tier = EXCLUDED.tier,
            budget_proposal = EXCLUDED.budget_proposal,
            message = EXCLUDED.message,
            status = EXCLUDED.status,
            admin_notes = EXCLUDED.admin_notes,
            updated_at = NOW()`,
          [
            sponsor.id,
            sponsor.eventId || null,
            sponsor.eventTitle || null,
            sponsor.companyName,
            sponsor.brandName,
            sponsor.contactPerson,
            sponsor.phone,
            sponsor.email || null,
            sponsor.website || null,
            sponsor.logoUrl || null,
            sponsor.tier || 'silver',
            sponsor.budgetProposal || null,
            sponsor.message || null,
            sponsor.status || 'pending',
            sponsor.adminNotes || null,
            sponsor.createdAt || new Date().toISOString(),
            sponsor.updatedAt || new Date().toISOString(),
          ]
        );
      } catch (e) {
        console.error('Postgres error in saveSponsor:', (e as Error).message);
      }
    }

    return sponsor;
  }

  public async updateSponsorStatus(
    id: string,
    status: SponsorStatus,
    adminNotes?: string
  ): Promise<SponsorItem | null> {
    const s = await this.getSponsorById(id);
    if (!s) return null;

    s.status = status;
    if (adminNotes !== undefined) s.adminNotes = adminNotes.trim();
    s.updatedAt = new Date().toISOString();

    this.memorySponsors.set(id, s);
    this.saveToLocalStore();

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE sponsors SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = NOW() WHERE id = $3`,
          [status, adminNotes !== undefined ? adminNotes.trim() : null, id]
        );
      } catch (e) {
        console.error('Postgres error in updateSponsorStatus:', (e as Error).message);
      }
    }

    return s;
  }

  public async deleteSponsor(id: string): Promise<boolean> {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM sponsors WHERE id = $1', [id]);
      } catch (e) {
        console.error('Postgres error in deleteSponsor:', (e as Error).message);
      }
    }
    const result = this.memorySponsors.delete(id);
    this.saveToLocalStore();
    return result;
  }

  // ---------------------------------------------------------------------------
  // REVIEWS
  // ---------------------------------------------------------------------------
  public async getReviews(vendorRegistrationId: string): Promise<VendorReview[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM reviews WHERE vendor_registration_id = $1 ORDER BY created_at DESC',
          [vendorRegistrationId]
        );
        return res.rows.map((row: any) => ({
          id: row.id,
          vendorRegistrationId: row.vendor_registration_id,
          eventId: row.event_id || '',
          reviewerName: row.reviewer_name || 'کاربر مهمان',
          stars: Number(row.stars) || 5,
          comment: row.comment || '',
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        }));
      } catch (e) {
        console.error('Postgres error in getReviews:', (e as Error).message);
      }
    }

    return Array.from(this.memoryReviews.values()).filter(
      (r) => r.vendorRegistrationId === vendorRegistrationId
    );
  }

  public async addReview(review: VendorReview): Promise<VendorReview> {
    this.memoryReviews.set(review.id, review);
    this.saveToLocalStore();

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO reviews (id, vendor_registration_id, event_id, reviewer_name, stars, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            review.id,
            review.vendorRegistrationId,
            review.eventId || null,
            review.reviewerName,
            review.stars,
            review.comment,
            review.createdAt || new Date().toISOString(),
          ]
        );

        // Recalculate average rating in PostgreSQL
        const avgRes = await this.pool.query(
          `SELECT AVG(stars)::numeric(3,2) as avg_stars, COUNT(id)::int as count
           FROM reviews WHERE vendor_registration_id = $1`,
          [review.vendorRegistrationId]
        );

        if (avgRes.rows.length > 0) {
          const avg = parseFloat(avgRes.rows[0].avg_stars || '5.0');
          const count = parseInt(avgRes.rows[0].count || '0', 10);
          await this.pool.query(
            `UPDATE vendor_registrations SET rating_average = $1, rating_count = $2 WHERE id = $3`,
            [avg, count, review.vendorRegistrationId]
          );
        }
      } catch (e) {
        console.error('Postgres error in addReview:', (e as Error).message);
      }
    }

    // Update in memory as well
    const vendorReviews = Array.from(this.memoryReviews.values()).filter(
      (r) => r.vendorRegistrationId === review.vendorRegistrationId
    );
    if (vendorReviews.length > 0) {
      const sum = vendorReviews.reduce((acc, curr) => acc + curr.stars, 0);
      const avg = parseFloat((sum / vendorReviews.length).toFixed(1));
      const vendor = this.memoryVendors.get(review.vendorRegistrationId);
      if (vendor) {
        vendor.ratingAverage = avg;
        vendor.ratingCount = vendorReviews.length;
        this.memoryVendors.set(vendor.id, vendor);
        this.saveToLocalStore();
      }
    }

    return review;
  }

  // ---------------------------------------------------------------------------
  // OTP AUTHENTICATION CACHE
  // ---------------------------------------------------------------------------
  public setOtp(phone: string, code: string, ttlMs = 180000) {
    this.memoryOtp.set(phone, {
      code,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public getOtp(phone: string): string | null {
    const item = this.memoryOtp.get(phone);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryOtp.delete(phone);
      return null;
    }
    return item.code;
  }

  public clearOtp(phone: string) {
    this.memoryOtp.delete(phone);
  }
}

export const db = new DatabaseService();
