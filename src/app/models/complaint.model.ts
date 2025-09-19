export interface Complaint {
  id: string;
  memberId: string;
  memberName: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  contactPreference: ContactPreference;
  submissionDate: Date;
  status: ComplaintStatus;
  supportResponse?: string;
  resolutionNotes?: string;
  lastUpdated: Date;
  assignedTo?: string;
  priority: ComplaintPriority;
}

export type ComplaintCategory = 
  | 'Library Service'
  | 'Borrowing Process'
  | 'Payment Issues'
  | 'Book Condition'
  | 'Staff Behavior'
  | 'System Technical'
  | 'Facility Issues'
  | 'Other';

export type ContactPreference = 'Email' | 'Phone';

export type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ComplaintFormData {
  category: ComplaintCategory | '';
  title: string;
  description: string;
  contactPreference: ContactPreference | '';
}

export interface ComplaintResponse {
  success: boolean;
  complaintId?: string;
  message: string;
}

export interface ComplaintListResponse {
  complaints: Complaint[];
  totalCount: number;
}

export interface ComplaintAction {
  action: 'confirm_resolution' | 'reopen' | 'close';
  complaintId: string;
  notes?: string;
}
