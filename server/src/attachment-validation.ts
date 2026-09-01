export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

type AttachmentRule = {
  extension: string;
  mimeType: string;
  matches: (bytes: Buffer) => boolean;
};

const attachmentRules: AttachmentRule[] = [
  { extension: 'jpg', mimeType: 'image/jpeg', matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { extension: 'jpeg', mimeType: 'image/jpeg', matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { extension: 'png', mimeType: 'image/png', matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { extension: 'webp', mimeType: 'image/webp', matches: (bytes) => bytes.length >= 12 && bytes.subarray(0, 4).equals(Buffer.from('RIFF')) && bytes.subarray(8, 12).equals(Buffer.from('WEBP')) },
  { extension: 'pdf', mimeType: 'application/pdf', matches: (bytes) => bytes.subarray(0, 5).equals(Buffer.from('%PDF-')) },
];

export type AttachmentValidationResult =
  | { success: true; value: { originalName: string; extension: string; mimeType: string; sizeBytes: number } }
  | { success: false; code: 'ATTACHMENT_NAME_INVALID' | 'ATTACHMENT_TYPE_INVALID' | 'ATTACHMENT_TOO_LARGE'; message: string };

export const sanitizeAttachmentName = (input: unknown):
  | { success: true; value: { originalName: string; extension: string } }
  | { success: false; message: string } => {
  if (typeof input !== 'string') return { success: false, message: 'Choose a file with a safe name.' };
  const basename = input.split(/[\\/]/).pop()!.normalize('NFC').trim().replace(/[\u0000-\u001f\u007f]/g, '');
  const match = /^(.+)\.([^.]+)$/.exec(basename);
  if (!match || !match[1] || basename === '.' || basename === '..' || Buffer.byteLength(basename, 'utf8') > 255) {
    return { success: false, message: 'Choose a file with a safe name.' };
  }
  return { success: true, value: { originalName: basename, extension: match[2].toLowerCase() } };
};

export const validateAttachmentFile = ({ originalName, mimeType, bytes }: { originalName: unknown; mimeType: unknown; bytes: Buffer }): AttachmentValidationResult => {
  const name = sanitizeAttachmentName(originalName);
  if (!name.success) return { success: false, code: 'ATTACHMENT_NAME_INVALID', message: name.message };
  if (bytes.length > MAX_ATTACHMENT_BYTES) return { success: false, code: 'ATTACHMENT_TOO_LARGE', message: 'Each Attachment must be 5 MiB or smaller.' };
  const rule = attachmentRules.find((candidate) => candidate.extension === name.value.extension);
  if (!rule || mimeType !== rule.mimeType || !rule.matches(bytes)) {
    return { success: false, code: 'ATTACHMENT_TYPE_INVALID', message: 'The file type could not be verified.' };
  }
  return { success: true, value: { ...name.value, mimeType: rule.mimeType, sizeBytes: bytes.length } };
};

export const validateRemovalReason = (reason: unknown):
  | { success: true; value: string }
  | { success: false; message: string } => {
  const value = typeof reason === 'string' ? reason.normalize('NFC').trim() : '';
  return value.length >= 5 && value.length <= 200
    ? { success: true, value }
    : { success: false, message: 'Removal reason must contain 5 to 200 characters.' };
};
