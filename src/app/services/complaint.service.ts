import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { 
  Complaint, 
  ComplaintFormData, 
  ComplaintResponse, 
  ComplaintListResponse,
  ComplaintAction,
  ComplaintStatus,
  ComplaintCategory,
  ComplaintPriority
} from '../models/complaint.model';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ComplaintService {
  private complaintsSubject = new BehaviorSubject<Complaint[]>([]);
  public complaints$ = this.complaintsSubject.asObservable();

  constructor(
    private storageService: StorageService,
    private authService: AuthService
  ) {
    this.initializeComplaints();
  }

  private initializeComplaints(): void {
    const complaints = this.getStoredComplaints();
    this.complaintsSubject.next(complaints);
  }

  private getStoredComplaints(): Complaint[] {
    try {
      const stored = this.storageService.getItem('complaints');
      const complaints = stored ? JSON.parse(stored) : [];
      
      // Convert date strings back to Date objects
      return complaints.map((complaint: any) => ({
        ...complaint,
        submissionDate: new Date(complaint.submissionDate),
        lastUpdated: new Date(complaint.lastUpdated)
      }));
    } catch (error) {
      console.error('Error loading complaints:', error);
      return [];
    }
  }

  private saveComplaints(complaints: Complaint[]): void {
    try {
      this.storageService.setItem('complaints', JSON.stringify(complaints));
      this.complaintsSubject.next(complaints);
    } catch (error) {
      console.error('Error saving complaints:', error);
    }
  }

  // ✅ Submit new complaint
  submitComplaint(formData: ComplaintFormData): Observable<ComplaintResponse> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        return of({
          success: false,
          message: 'User not authenticated. Please log in and try again.'
        }).pipe(delay(300));
      }

      // Generate unique complaint ID
      const complaintId = this.generateComplaintId();
      
      // Create new complaint
      const newComplaint: Complaint = {
        id: complaintId,
        memberId: currentUser.memberId,
        memberName: currentUser.memberName,
        category: formData.category as ComplaintCategory,
        title: formData.title.trim(),
        description: formData.description.trim(),
        contactPreference: formData.contactPreference as any,
        submissionDate: new Date(),
        status: 'Open',
        lastUpdated: new Date(),
        priority: this.determinePriority(formData.category as ComplaintCategory)
      };

      // Save to storage
      const complaints = this.complaintsSubject.value;
      complaints.unshift(newComplaint); // Add to beginning for most recent first
      this.saveComplaints(complaints);

      console.log('✅ Complaint submitted:', complaintId);

      return of({
        success: true,
        complaintId: complaintId,
        message: `Your complaint has been successfully submitted with ID: ${complaintId}. We will review it shortly.`
      }).pipe(delay(500));

    } catch (error) {
      console.error('Error submitting complaint:', error);
      return of({
        success: false,
        message: 'Failed to submit complaint. Please try again.'
      }).pipe(delay(300));
    }
  }

  // ✅ Get complaints for current user
  getUserComplaints(): Observable<ComplaintListResponse> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of({
        complaints: [],
        totalCount: 0
      }).pipe(delay(300));
    }

    return this.complaints$.pipe(
      map(complaints => {
        const userComplaints = complaints
          .filter(complaint => complaint.memberId === currentUser.memberId)
          .sort((a, b) => b.submissionDate.getTime() - a.submissionDate.getTime());

        return {
          complaints: userComplaints,
          totalCount: userComplaints.length
        };
      }),
      delay(400)
    );
  }

  // ✅ Get complaint by ID
  getComplaintById(complaintId: string): Observable<Complaint | null> {
    return this.complaints$.pipe(
      map(complaints => {
        const complaint = complaints.find(c => c.id === complaintId);
        return complaint || null;
      }),
      delay(200)
    );
  }

  // ✅ Update complaint status
  updateComplaintStatus(complaintId: string, status: ComplaintStatus, notes?: string): Observable<boolean> {
    try {
      const complaints = this.complaintsSubject.value;
      const complaintIndex = complaints.findIndex(c => c.id === complaintId);

      if (complaintIndex === -1) {
        return of(false).pipe(delay(300));
      }

      complaints[complaintIndex].status = status;
      complaints[complaintIndex].lastUpdated = new Date();

      if (notes) {
        if (status === 'Resolved') {
          complaints[complaintIndex].resolutionNotes = notes;
        } else {
          complaints[complaintIndex].supportResponse = notes;
        }
      }

      this.saveComplaints(complaints);
      console.log(`✅ Complaint ${complaintId} status updated to: ${status}`);

      return of(true).pipe(delay(300));

    } catch (error) {
      console.error('Error updating complaint status:', error);
      return of(false).pipe(delay(300));
    }
  }

  // ✅ Handle complaint actions (confirm resolution, reopen, etc.)
  handleComplaintAction(action: ComplaintAction): Observable<ComplaintResponse> {
    try {
      const complaints = this.complaintsSubject.value;
      const complaintIndex = complaints.findIndex(c => c.id === action.complaintId);

      if (complaintIndex === -1) {
        return of({
          success: false,
          message: 'The complaint you are looking for does not exist or has been deleted.'
        }).pipe(delay(300));
      }

      const complaint = complaints[complaintIndex];

      switch (action.action) {
        case 'confirm_resolution':
          if (complaint.status !== 'Resolved') {
            return of({
              success: false,
              message: 'Only resolved complaints can be confirmed.'
            }).pipe(delay(300));
          }
          complaint.status = 'Closed';
          complaint.lastUpdated = new Date();
          break;

        case 'reopen':
          if (complaint.status === 'Closed') {
            return of({
              success: false,
              message: 'Closed complaints cannot be reopened. Please submit a new complaint if needed.'
            }).pipe(delay(300));
          }
          complaint.status = 'Open';
          complaint.lastUpdated = new Date();
          if (action.notes) {
            complaint.supportResponse = action.notes;
          }
          break;

        case 'close':
          complaint.status = 'Closed';
          complaint.lastUpdated = new Date();
          break;

        default:
          return of({
            success: false,
            message: 'Invalid action specified.'
          }).pipe(delay(300));
      }

      this.saveComplaints(complaints);

      return of({
        success: true,
        message: `Complaint ${action.complaintId} has been ${action.action.replace('_', ' ')}.`
      }).pipe(delay(400));

    } catch (error) {
      console.error('Error handling complaint action:', error);
      return of({
        success: false,
        message: 'Unable to process the request. Please try again later.'
      }).pipe(delay(300));
    }
  }

  // ✅ Update complaint (for editing open complaints)
  updateComplaint(complaintId: string, formData: ComplaintFormData): Observable<ComplaintResponse> {
    try {
      const complaints = this.complaintsSubject.value;
      const complaintIndex = complaints.findIndex(c => c.id === complaintId);

      if (complaintIndex === -1) {
        return of({
          success: false,
          message: 'Complaint not found.'
        }).pipe(delay(300));
      }

      const complaint = complaints[complaintIndex];

      // Only allow editing if complaint is in Open status
      if (complaint.status !== 'Open') {
        return of({
          success: false,
          message: 'Only open complaints can be edited.'
        }).pipe(delay(300));
      }

      // Update complaint details
      complaint.category = formData.category as ComplaintCategory;
      complaint.title = formData.title.trim();
      complaint.description = formData.description.trim();
      complaint.contactPreference = formData.contactPreference as any;
      complaint.lastUpdated = new Date();
      complaint.priority = this.determinePriority(formData.category as ComplaintCategory);

      this.saveComplaints(complaints);

      return of({
        success: true,
        complaintId: complaintId,
        message: 'Your complaint has been updated successfully.'
      }).pipe(delay(400));

    } catch (error) {
      console.error('Error updating complaint:', error);
      return of({
        success: false,
        message: 'Failed to update complaint. Please try again.'
      }).pipe(delay(300));
    }
  }

  // ✅ Get complaint statistics
  getComplaintStats(): Observable<{[key in ComplaintStatus]: number}> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of({
        'Open': 0,
        'In Progress': 0,
        'Resolved': 0,
        'Closed': 0
      });
    }

    return this.complaints$.pipe(
      map(complaints => {
        const userComplaints = complaints.filter(c => c.memberId === currentUser.memberId);
        
        return {
          'Open': userComplaints.filter(c => c.status === 'Open').length,
          'In Progress': userComplaints.filter(c => c.status === 'In Progress').length,
          'Resolved': userComplaints.filter(c => c.status === 'Resolved').length,
          'Closed': userComplaints.filter(c => c.status === 'Closed').length
        };
      })
    );
  }

  // ✅ Private helper methods
  private generateComplaintId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `CMP-${timestamp}-${randomStr}`.toUpperCase();
  }

  private determinePriority(category: ComplaintCategory): ComplaintPriority {
    switch (category) {
      case 'Payment Issues':
      case 'System Technical':
        return 'High';
      case 'Staff Behavior':
      case 'Facility Issues':
        return 'Medium';
      case 'Book Condition':
      case 'Library Service':
        return 'Medium';
      case 'Borrowing Process':
        return 'Low';
      default:
        return 'Low';
    }
  }

  // ✅ Simulate admin responses for demo
  simulateAdminResponse(complaintId: string): void {
    setTimeout(() => {
      const responses = [
        "Thank you for your complaint. We are reviewing your issue and will get back to you within 2 business days.",
        "We have received your complaint and assigned it to our support team. We appreciate your patience.",
        "Your complaint is being investigated. We will update you on the progress soon.",
        "Thank you for bringing this to our attention. We are working on a resolution."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      this.updateComplaintStatus(complaintId, 'In Progress', randomResponse);
    }, 3000); // Simulate response after 3 seconds
  }
}
