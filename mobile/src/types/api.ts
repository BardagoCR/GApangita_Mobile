export type User = {
  user_id: number;
  user_code: string;
  user_role: 'Admin' | 'Staff';
  username: string;
};

export type Category = {
  category_code: string;
  name: string;
};

export type Branch = {
  branch_code: string;
  name: string;
};

export type Location = {
  location_code: string;
  name: string;
};

export type PublicColor =
  | 'Black'
  | 'White'
  | 'Gray'
  | 'Silver'
  | 'Brown'
  | 'Beige'
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'Green'
  | 'Blue'
  | 'Purple'
  | 'Pink'
  | 'Gold'
  | 'Multicolor'
  | 'Transparent / Clear'
  | 'Other'
  | 'Unknown';

export type Item = {
  name: string | null;
  item_code: string;
  item_type: 'lost' | 'found';
  status: 'Available' | 'Under Verification' | 'Unavailable' | 'Contact Staff' | 'Closed';
  categoryName: string | null;
  public_color: string | null;
  branchName: string | null;
  date_found: string | null;
  date_reported: string | null;
  can_claim: boolean;
  reporter_contact_number?: string | null;
  reporter_email?: string | null;
};

export type SearchResponse = {
  items: Item[];
  total: number;
  page: number;
  limit: number;
};

export type ImageAttachment = {
  uri: string;
  name: string;
  mimeType: string;
  file?: Blob;
  size?: number;
};

export type ReportInput = {
  contactNumber: string;
  email: string;
  name: string;
  description: string;
  itemType: Item['item_type'];
  categoryCode: string;
  branchCode: string;
  locationCode: string;
  dateFound: string;
  publicColor: PublicColor;
  image?: ImageAttachment | null;
};

export type ClaimInput = {
  itemCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  affiliation: 'Student' | 'Faculty' | 'Staff' | 'Visitor';
  lastSeenLocation: string;
  lastSeenDateTime: string;
  itemDescription: string;
  identifyingFeatures: string;
  contents: string;
  additionalEvidence: string;
  evidence?: ImageAttachment | null;
};

export type Claim = {
  claimed_item_id: number;
  claimed_item_code: string;
  item_code: string;
  claimer_first_name: string;
  claimer_middle_name: string | null;
  claimer_last_name: string;
  contact_number: string;
  claimant_email: string;
  claimant_affiliation: ClaimInput['affiliation'];
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Returned';
  date_claimed: string;
  date_updated: string;
  staff_notes?: string | null;
  evidence_file_path?: string | null;
  item_description_private?: string;
  identifying_features?: string;
  contents?: string;
  additional_evidence?: string;
  last_seen_location?: string;
  last_seen_date_time?: string;
};