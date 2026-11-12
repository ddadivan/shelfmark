import { Dialog } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({ template: '<p>content</p>' })
class ContentComponent {}

interface RecaptureContainer {
  _recaptureFocus?: () => void;
}

describe('CDK dialog internals used by openModalOverlay', () => {
  it('still has the private _recaptureFocus on the container (re-check on CDK upgrades)', () => {
    const ref = TestBed.inject(Dialog).open(ContentComponent);
    const container = ref.containerInstance as unknown as RecaptureContainer;
    expect(typeof container._recaptureFocus).toBe('function');
    ref.close();
  });
});
