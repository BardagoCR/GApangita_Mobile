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

export type Item = {
  item_code: string;
  name: string;
  description: string | null;
  item_type: 'lost' | 'found';
  status: string;
  categoryName: string | null;
  branchName: string | null;
  locationName: string | null;
  item_file_path: string | null;
  date_found: string | null;
  date_reported: string | null;
  relevance?: number;
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
};

export type ReportInput = {
  name: string;
  description: string;
  itemType: Item['item_type'];
  categoryCode: string;
  branchCode: string;
  locationCode: string;
  dateFound: string;
  image?: ImageAttachment | null;
};

export type ClaimInput = {
  itemCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  proof: ImageAttachment;
};