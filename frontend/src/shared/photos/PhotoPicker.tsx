import { useEffect, useState } from "react";
import { MAX_IMAGE_BYTES, mediaSrc } from "@/features/content/api";
import { PhotoFrame } from "@/shared/photos/PhotoFrame";

export type PhotoFields = {
  photoFile: File | null;
  photoRemoved: boolean;
  photoBaseline: string | null;
};

export const EMPTY_PHOTO: PhotoFields = { photoFile: null, photoRemoved: false, photoBaseline: null };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  idPrefix: string;
  form: PhotoFields;
  onChange: (photo: PhotoFields) => void;
  fieldClass: string;
  fileClass: string;
  hintClass: string;
  errorClass: string;
};

export function PhotoPicker({ idPrefix, form, onChange, fieldClass, fileClass, hintClass, errorClass }: Props) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!form.photoFile) {
      setObjectUrl(null);
      return;
    }
    const next = URL.createObjectURL(form.photoFile);
    setObjectUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [form.photoFile]);

  const preview = form.photoRemoved ? null : (objectUrl ?? mediaSrc(form.photoBaseline));

  function choose(file: File | undefined) {
    setLocalError(null);
    if (!file) {
      return;
    }
    const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!IMAGE_TYPES.has(type)) {
      setLocalError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError("Image must be 48 MB or smaller.");
      return;
    }
    onChange({ ...form, photoFile: file, photoRemoved: false });
  }

  return (
    <div className={fieldClass}>
      <label htmlFor={`${idPrefix}-photo`}>Photo</label>
      {preview ? (
        <PhotoFrame
          url={preview}
          onRemove={() => onChange({ photoFile: null, photoRemoved: true, photoBaseline: form.photoBaseline })}
        />
      ) : null}
      <input
        id={`${idPrefix}-photo`}
        className={fileClass}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          choose(file);
        }}
      />
      <span className={hintClass}>
        Optional. JPEG, PNG, or WebP, up to 48 MB. Choosing a new photo replaces the previous one.
      </span>
      {localError ? <p className={errorClass}>{localError}</p> : null}
    </div>
  );
}
