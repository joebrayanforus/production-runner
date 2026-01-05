import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BossFightComponent } from './boss-fight.component';

describe('BossFightComponent', () => {
  let component: BossFightComponent;
  let fixture: ComponentFixture<BossFightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BossFightComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BossFightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
