import { Injectable } from '@angular/core';
import { RequiredModulesService } from './required-modules.service';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  constructor(private requiredModulesService: RequiredModulesService) {}
}
