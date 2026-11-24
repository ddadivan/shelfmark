import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SidebarTagsComponent } from '../../components/sidebar-tags/sidebar-tags.component';

/**
 * The Tags page (Shelf `04-organise` "Tags"): every tag as a chip with its count (chips filter the
 * feed through `?tag=`, "+" creates, a right click, a long press or the chip's "..." opens rename,
 * merge and delete). The Tags tab of the phone, and on wider screens the page the sidebar's tag
 * section stands in for.
 */
@Component({
  selector: 'app-tags-page',
  imports: [SidebarTagsComponent],
  templateUrl: './tags.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TagsPage {}
