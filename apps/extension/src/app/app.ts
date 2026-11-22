import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { PopupDuplicateComponent } from './popup/components/popup-duplicate/popup-duplicate.component';
import { PopupFormComponent } from './popup/components/popup-form/popup-form.component';
import { PopupNewFolderComponent } from './popup/components/popup-new-folder/popup-new-folder.component';
import { PopupMessageComponent } from './popup/components/popup-message/popup-message.component';
import { PopupOpeningComponent } from './popup/components/popup-opening/popup-opening.component';
import { PopupPickerComponent } from './popup/components/popup-picker/popup-picker.component';
import { PopupSavedComponent } from './popup/components/popup-saved/popup-saved.component';
import { PopupSavedTabsComponent } from './popup/components/popup-saved-tabs/popup-saved-tabs.component';
import { PopupSignedOutComponent } from './popup/components/popup-signed-out/popup-signed-out.component';
import { POPUP_VIEW } from './popup/models/popup-view.const';
import { PopupStore } from './popup/popup.store';

/** The popup: one screen at a time, chosen by `PopupStore.view`. */
@Component({
  selector: 'ext-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PopupDuplicateComponent,
    PopupFormComponent,
    PopupMessageComponent,
    PopupNewFolderComponent,
    PopupOpeningComponent,
    PopupPickerComponent,
    PopupSavedComponent,
    PopupSavedTabsComponent,
    PopupSignedOutComponent,
  ],
})
export class App implements OnInit {
  protected readonly store = inject(PopupStore);
  protected readonly POPUP_VIEW = POPUP_VIEW;

  ngOnInit(): void {
    void this.store.init();
  }
}
