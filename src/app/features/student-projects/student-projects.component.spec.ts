import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { StudentProjectsComponent } from './student-projects.component';
import { httpErrorInterceptor } from '../../core/interceptors/http-error.interceptor';
import { LEAD_TYPE } from '../../core/models/lead.model';
import { environment } from '../../../environments/environment';

const LEADS_URL = `${environment.apiUrl}/leads`;
const UPLOAD_URL = `${environment.apiUrl}/upload`;

const VALID = {
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
  phone: '9876543210',
  college: 'BMS College of Engineering',
  branch: 'CSE',
  projectType: 'major',
  expectedSubmissionDate: '2027-04-30',
  urgency: '1_month',
  description: 'A crop disease detection system using a CNN, with a web dashboard.'
};

function fakeFile(name: string, sizeBytes: number): File {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function changeEvent(files: File[]): Event {
  return {
    target: { files, value: 'C:\\fakepath\\x' }
  } as unknown as Event;
}

describe('StudentProjectsComponent', () => {
  let fixture: ComponentFixture<StudentProjectsComponent>;
  let component: StudentProjectsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentProjectsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentProjectsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  const fill = (values: Partial<typeof VALID> = {}) =>
    component.projectForm.setValue({ ...VALID, ...values });

  // ------------------------------------------------------------- validation
  describe('validation', () => {
    it('starts invalid', () => {
      expect(component.projectForm.valid).toBeFalse();
    });

    it('is valid with well-formed values', () => {
      fill();
      expect(component.projectForm.valid).toBeTrue();
    });

    it('requires every academic field', () => {
      const required = [
        'name',
        'email',
        'phone',
        'college',
        'branch',
        'projectType',
        'expectedSubmissionDate',
        'urgency',
        'description'
      ];

      for (const field of required) {
        fill();
        component.projectForm.get(field)?.setValue('');
        expect(component.projectForm.valid).withContext(field).toBeFalse();
      }
    });

    it('rejects a bad phone number', () => {
      fill({ phone: '1234567890' });
      expect(component.projectForm.get('phone')?.valid).toBeFalse();
    });

    it('requires a college name of at least 3 characters', () => {
      fill({ college: 'AB' });
      expect(component.projectForm.get('college')?.hasError('minlength')).toBeTrue();
    });

    it('exposes a readable error once touched', () => {
      const control = component.projectForm.get('phone');
      control?.setValue('123');
      control?.markAsTouched();

      expect(component.isInvalid('phone')).toBeTrue();
      expect(component.getError('phone')).toContain('10-digit');
    });
  });

  // -------------------------------------------------------- file attachments
  describe('attachments', () => {
    it('accepts allowed file types', () => {
      component.onFilesSelected(changeEvent([fakeFile('synopsis.pdf', 1024)]));

      expect(component.fileError()).toBe('');
      expect(component.selectedFiles().length).toBe(1);
    });

    it('rejects an unsupported extension', () => {
      component.onFilesSelected(changeEvent([fakeFile('virus.exe', 1024)]));

      expect(component.fileError()).toContain('supported file type');
      expect(component.selectedFiles().length).toBe(0);
    });

    it('rejects a file over 10 MB', () => {
      component.onFilesSelected(
        changeEvent([fakeFile('huge.pdf', 11 * 1024 * 1024)])
      );

      expect(component.fileError()).toContain('10 MB');
      expect(component.selectedFiles().length).toBe(0);
    });

    it('rejects more than five files', () => {
      const files = Array.from({ length: 6 }, (_, i) =>
        fakeFile(`doc${i}.pdf`, 1024)
      );
      component.onFilesSelected(changeEvent(files));

      expect(component.fileError()).toContain('at most 5');
      expect(component.selectedFiles().length).toBe(0);
    });

    it('removes a single file by index', () => {
      component.onFilesSelected(
        changeEvent([fakeFile('a.pdf', 10), fakeFile('b.pdf', 10)])
      );
      component.removeFile(0);

      expect(component.selectedFiles().map((f) => f.name)).toEqual(['b.pdf']);
    });

    it('formats file sizes readably', () => {
      expect(component.formatSize(512)).toBe('512 B');
      expect(component.formatSize(2048)).toBe('2 KB');
      expect(component.formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
    });
  });

  // ----------------------------------------------------------------- submit
  describe('submit', () => {
    it('does not call the API when invalid', () => {
      component.submit();
      httpMock.expectNone(LEADS_URL);
    });

    it('posts the student_project lead type with academic fields', () => {
      fill();
      component.submit();

      const req = httpMock.expectOne(LEADS_URL);
      expect(req.request.body).toEqual(
        jasmine.objectContaining({
          lead_type: LEAD_TYPE.StudentProject,
          college_name: 'BMS College of Engineering',
          branch: 'CSE',
          submission_date: '2027-04-30',
          urgency: '1_month',
          attachments: []
        })
      );
      // projectType is mapped to its human-readable label for the admin panel.
      expect(req.request.body.project_title).toBe('Major / final year project');

      req.flush({ message: 'created' });
    });

    it('uploads attachments first, then submits their URLs', fakeAsync(() => {
      fill();
      component.onFilesSelected(changeEvent([fakeFile('synopsis.pdf', 2048)]));
      component.submit();

      const upload = httpMock.expectOne(UPLOAD_URL);
      expect(upload.request.method).toBe('POST');
      upload.flush({ file_name: 'synopsis.pdf', file_url: '/uploads/synopsis.pdf' });
      tick();

      const lead = httpMock.expectOne(LEADS_URL);
      expect(lead.request.body.attachments).toEqual(['/uploads/synopsis.pdf']);
      lead.flush({ message: 'created' });
      tick();

      expect(component.submitSuccess()).toContain('within 24 hours');
    }));

    it('skips the upload call when there are no attachments', () => {
      fill();
      component.submit();

      httpMock.expectNone(UPLOAD_URL);
      httpMock.expectOne(LEADS_URL).flush({ message: 'created' });
    });

    it('resets the form and clears files on success', fakeAsync(() => {
      fill();
      component.submit();
      httpMock.expectOne(LEADS_URL).flush({ message: 'created' });
      tick();

      expect(component.projectForm.get('name')?.value).toBeNull();
      expect(component.selectedFiles().length).toBe(0);
      expect(component.submitError()).toBe('');
    }));

    it('reports an upload failure distinctly from a submit failure', fakeAsync(() => {
      fill();
      component.onFilesSelected(changeEvent([fakeFile('synopsis.pdf', 2048)]));
      component.submit();

      httpMock
        .expectOne(UPLOAD_URL)
        .flush({}, { status: 500, statusText: 'Server Error' });
      tick();

      expect(component.submitError()).toContain('upload');
      httpMock.expectNone(LEADS_URL);
    }));

    it('explains a 413 on upload in terms of file size', fakeAsync(() => {
      fill();
      component.onFilesSelected(changeEvent([fakeFile('big.pdf', 2048)]));
      component.submit();

      httpMock
        .expectOne(UPLOAD_URL)
        .flush({}, { status: 413, statusText: 'Payload Too Large' });
      tick();

      expect(component.submitError()).toContain('too large');
    }));

    it('shows a network message when the API is unreachable', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LEADS_URL)
        .error(new ProgressEvent('error'), { status: 0 });
      tick();

      expect(component.submitError()).toContain('WhatsApp');
      expect(component.isSubmitting()).toBeFalse();
    }));

    it('clears the loading flag after failure', fakeAsync(() => {
      fill();
      component.submit();
      expect(component.isSubmitting()).toBeTrue();

      httpMock
        .expectOne(LEADS_URL)
        .flush({}, { status: 500, statusText: 'Server Error' });
      tick();

      expect(component.isSubmitting()).toBeFalse();
    }));
  });
});
