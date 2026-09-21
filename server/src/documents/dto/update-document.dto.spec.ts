import { validateSync } from 'class-validator';
import { UpdateDocumentDto } from './update-document.dto';

describe('UpdateDocumentDto', () => {
  it('rejects null content instead of sending it to a NOT NULL JSONB column', () => {
    const dto = Object.assign(new UpdateDocumentDto(), {
      version: 1,
      content: null,
    });

    expect(
      validateSync(dto).some((error) => error.property === 'content'),
    ).toBe(true);
  });
});
