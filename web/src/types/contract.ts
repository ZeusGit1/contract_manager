/** Mirrors the API enums in api/src/ContractManager.Api/Domain/Enums.cs.
 *  Values are the string names (the API serialises enums via JsonStringEnumConverter). */

export type ContractStatus =
  | 'InProcess'
  | 'WithVendor'
  | 'WithRequester'
  | 'WithLegal'
  | 'WithGCO'
  | 'WithInfoSec'
  | 'WithPrivacy'
  | 'OutForSignature'
  | 'Completed'
  | 'OnHold'
  | 'Canceled'
  | 'Expired'
  | 'Terminated';

export type Category = 'Event' | 'Facilities' | 'IT';

export type VendorType = 'EventVenue' | 'FacilitiesService' | 'Software' | 'ProfessionalServices';

export type PreferredStatus = 'Preferred' | 'Standard' | 'Difficult' | 'Blacklisted';

export type ITType = 'Software' | 'ProfessionalServices';

export type LicensingType = 'Subscription' | 'Perpetual' | 'PerUser';

export type Hosting = 'Cloud' | 'OnPremise' | 'Hybrid';

export type NoteType = 'Meeting' | 'Call' | 'Email' | 'Note';

export type AppRole = 'Procurement' | 'ProcurementAdmin' | 'Requester' | 'AttorneyReviewer';

export const FORWARD_STATUS_ORDER: ContractStatus[] = [
  'InProcess',
  'WithVendor',
  'WithRequester',
  'WithLegal',
  'WithGCO',
  'WithInfoSec',
  'WithPrivacy',
  'OutForSignature',
  'Completed',
];

export const EXCEPTION_STATUSES: ContractStatus[] = ['OnHold', 'Canceled', 'Expired', 'Terminated'];

export const CLOSED_STATUSES: ContractStatus[] = ['Completed', 'Canceled', 'Expired', 'Terminated'];
