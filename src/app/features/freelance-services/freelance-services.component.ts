import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-freelance-services',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './freelance-services.component.html',
  styleUrl: './freelance-services.component.scss'
})
export class FreelanceServicesComponent {}
