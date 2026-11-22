export type UserRole = 'admin' | 'vendor' | 'visitor';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export interface BoothTypeOption {
  id: string;
  title: string;
  price?: string;
  description?: string;
}

export interface EventItem {
  id: string;
  title: string;
  category: string;
  shamsiStartDate: string; // e.g., '1403/08/15'
  durationDays: number;
  location: string;
  description: string;
  bannerUrl?: string;
  maxBooths: number;
  boothPrice?: string;
  rulesAndInstructions?: string;
  contractTemplateText?: string;
  contractTemplateFileUrl?: string;
  boothLocations?: string[]; // Admin managed locations (e.g. سالن اصلی، سالن ملل، فضای باز)
  boothTypes?: BoothTypeOption[]; // Admin managed booth types per event
  boothRequirements?: string[]; // Admin managed facilities/requirements per event
  gallery?: string[]; // Image gallery for event photos / past editions
  createdAt: string;
  status?: EventStatus;
  vendorCount?: number;
}

export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'supporter';
export type SponsorStatus = 'pending' | 'approved' | 'rejected';

export interface SponsorItem {
  id: string;
  eventId?: string; // empty means general platform sponsor or specific eventId
  eventTitle?: string;
  companyName: string;
  brandName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  tier: SponsorTier;
  budgetProposal?: string;
  message?: string;
  status: SponsorStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'revision_needed';

export type BoothType = string;

export interface VendorRegistration {
  id: string;
  eventId: string;
  userId: string;
  brandName: string;
  guildGroup: string; // صنف / گروه کاری (e.g. نرم‌افزار، صنایع دستی، مواد غذایی)
  description: string;
  phone: string;
  email?: string;
  website?: string;
  logoUrl: string;
  hasLogo?: boolean;
  documents: {
    name: string;
    url: string;
    type: 'contract' | 'license' | 'id_card' | 'other';
  }[];
  boothType: BoothType;
  selectedLocation?: string; // e.g. 'سالن خلیج فارس'
  requestedFacilities?: string[]; // e.g. برق سه فاز، پیشخوان، استند
  assignedBoothNumber?: string; // e.g. 'غرفه B-12'
  isContractSigned?: boolean;
  signedBy?: string; // Full name of signatory
  signedAt?: string; // Shamsi or ISO timestamp of signature
  status: RegistrationStatus;
  adminNotes?: string;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorReview {
  id: string;
  vendorRegistrationId: string;
  eventId: string;
  reviewerName: string;
  stars: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface OtpSession {
  phone: string;
  code: string;
  expiresAt: number;
}
