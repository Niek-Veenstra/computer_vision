import {
  findDocumentMarkers,
  updateDocumentMarkerContent,
} from './document-marker-content';

describe('document marker content operations', () => {
  const markerId = 'f45e4bf4-88ca-42b7-843d-b781698be74c';
  const content = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Before ' },
          {
            type: 'recognitionMarker',
            attrs: { id: markerId, label: 'Equation one' },
            content: [{ type: 'text', text: 'pending' }],
          },
          { type: 'text', text: ' after' },
        ],
      },
    ],
  };

  it('lists markers and their content without returning the document body', () => {
    expect(findDocumentMarkers(content)).toEqual([
      {
        id: markerId,
        label: 'Equation one',
        content: [{ type: 'text', value: 'pending' }],
      },
    ]);
  });

  it('updates marker content while preserving the marker', () => {
    const result = updateDocumentMarkerContent(content, markerId, [
      { type: 'inlineMath', value: '8-4=4' },
    ]);

    expect(result.matches).toBe(1);
    expect(result.content).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Before ' },
            {
              type: 'recognitionMarker',
              attrs: { id: markerId, label: 'Equation one' },
              content: [{ type: 'inlineMath', attrs: { latex: '8-4=4' } }],
            },
            { type: 'text', text: ' after' },
          ],
        },
      ],
    });
  });

  it('clears content without deleting the marker', () => {
    const result = updateDocumentMarkerContent(content, markerId, []);
    const marker = findDocumentMarkers(result.content)[0];

    expect(result.matches).toBe(1);
    expect(marker).toEqual({
      id: markerId,
      label: 'Equation one',
      content: [],
    });
  });
});
