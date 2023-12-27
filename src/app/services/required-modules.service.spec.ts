import { TestBed } from '@angular/core/testing';

import { RequiredModulesService } from './required-modules.service';

describe('RequiredModulesService', () => {
  let service: RequiredModulesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequiredModulesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
