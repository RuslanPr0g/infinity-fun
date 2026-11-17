import { Component, input, model } from '@angular/core';

export interface SegmentOption<T> {
  value: T;
  label: string;
}

/** A row of toggle buttons where exactly one is on. Two-way bind with `[(value)]`. */
@Component({
  selector: 'ui-segmented',
  standalone: true,
  template: `
    <div class="ui-seg" role="radiogroup" [attr.aria-label]="label() || null">
      @for (o of options(); track o.value) {
        <button type="button" class="ui-btn seg" role="radio" [class.on]="o.value === value()" [attr.aria-checked]="o.value === value()"
          [disabled]="disabled()" (click)="value.set(o.value)">{{ o.label }}</button>
      }
    </div>
  `,
  styles: `:host { display: block; } .ui-seg { justify-content: center; }`,
})
export class SegmentedComponent<T> {
  readonly options = input.required<SegmentOption<T>[]>();
  readonly value = model.required<T>();
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
}
