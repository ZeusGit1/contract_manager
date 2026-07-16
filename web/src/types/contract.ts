/** Mirrors the API enums in api/src/ContractManager.Api/Domain/Enums.cs.
 *  Values are the string names (the API serialises enums via JsonStringEnumConverter). */

/** Kept for backwards compatibility. Legacy linear-status vocabulary from the v1 model —
 *  the v2 API models overall status + independent lane statuses instead. Screens that still
 *  reference this should migrate to OverallStatusApi + LaneStatusApi (below). */
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

/** v2 API overall status — a whole contract is Active, Completed, or Canceled. */
export type OverallStatusApi = 'Active' | 'Completed' | 'Canceled';

/** v2 API priority. */
export type PriorityApi = 'Low' | 'Medium' | 'High' | 'Critical';

/** The nine canonical lanes — every contract has one row per LaneIdApi. */
export type LaneIdApi =
  | 'Procurement'
  | 'Legal'
  | 'InfoSec'
  | 'Privacy'
  | 'GCO'
  | 'Vendor'
  | 'Requester'
  | 'Signature'
  | 'Filed';

/** Per-lane status. Active = {InReview, Waiting}. */
export type LaneStatusApi =
  | 'NotStarted'
  | 'InReview'
  | 'Waiting'
  | 'Approved'
  | 'Canceled'
  | 'NA'
  | 'Complete';

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
