import arrowUp from "@/assets/arrow-up.png";
import ellipsisVertical from "@/assets/ellipsis-vertical.svg";
import link from "@/assets/link.png";
import play from "@/assets/play.png";
import qrcode from "@/assets/qrcode.png";
import stop from "@/assets/stop.png";
import volumeHigh from "@/assets/volume-high.png";
import volumeOff from "@/assets/volume-off.png";

type IconProps = {
  className?: string;
};

function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "block",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

export function IconArrowUp({ className }: IconProps) {
  return <MaskIcon src={arrowUp} className={className} />;
}

export function IconLink({ className }: IconProps) {
  return <MaskIcon src={link} className={className} />;
}

export function IconPlay({ className }: IconProps) {
  return <MaskIcon src={play} className={className} />;
}

export function IconQrCode({ className }: IconProps) {
  return <MaskIcon src={qrcode} className={className} />;
}

export function IconStop({ className }: IconProps) {
  return <MaskIcon src={stop} className={className} />;
}

export function IconVolumeHigh({ className }: IconProps) {
  return <MaskIcon src={volumeHigh} className={className} />;
}

export function IconVolumeOff({ className }: IconProps) {
  return <MaskIcon src={volumeOff} className={className} />;
}

export function IconEllipsisVertical({ className }: IconProps) {
  return <MaskIcon src={ellipsisVertical} className={className} />;
}
