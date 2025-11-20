import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KindComponent } from './kind.component';

describe('KindComponent', () => {
  let component: KindComponent;
  let fixture: ComponentFixture<KindComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KindComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(KindComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
