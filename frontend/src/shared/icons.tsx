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

export function IconPenToSquare({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true">
      <path
        fill="currentColor"
        d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160v256c0 53 43 96 96 96h256c53 0 96-43 96-96v-96c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"
      />
    </svg>
  );
}
