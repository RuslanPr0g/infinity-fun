import { NgModule } from '@angular/core';
import { TypewriterDirective } from './type-writer/type-writer.directive';

@NgModule({
  declarations: [TypewriterDirective],
  providers: [],
  exports: [TypewriterDirective],
})
export class DirectiveModule {}
