import { QRCodeSVG } from "qrcode.react";

type Props = {
  url: string;
};

export function QRCode({ url }: Props) {
  if (!url) {
    return null;
  }

  return <QRCodeSVG value={url} size={200} />;
}