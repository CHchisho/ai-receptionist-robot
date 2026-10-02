import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUp,
  faEllipsisVertical,
  faEye,
  faEyeSlash,
  faLink,
  faMicrophone,
  faPenToSquare,
  faPlay,
  faStop,
  faTrash,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";

type IconProps = {
  className?: string;
};

export function IconArrowUp({ className }: IconProps) {
  return <FontAwesomeIcon icon={faArrowUp} className={className} />;
}

export function IconLink({ className }: IconProps) {
  return <FontAwesomeIcon icon={faLink} className={className} />;
}

export function IconPlay({ className }: IconProps) {
  return <FontAwesomeIcon icon={faPlay} className={className} />;
}

export function IconStop({ className }: IconProps) {
  return <FontAwesomeIcon icon={faStop} className={className} />;
}

export function IconVolumeHigh({ className }: IconProps) {
  return <FontAwesomeIcon icon={faVolumeHigh} className={className} />;
}

export function IconVolumeOff({ className }: IconProps) {
  return <FontAwesomeIcon icon={faVolumeXmark} className={className} />;
}

export function IconEye({ className }: IconProps) {
  return <FontAwesomeIcon icon={faEye} className={className} />;
}

export function IconEyeSlash({ className }: IconProps) {
  return <FontAwesomeIcon icon={faEyeSlash} className={className} />;
}

export function IconTrash({ className }: IconProps) {
  return <FontAwesomeIcon icon={faTrash} className={className} />;
}

export function IconEllipsisVertical({ className }: IconProps) {
  return <FontAwesomeIcon icon={faEllipsisVertical} className={className} />;
}

export function IconPenToSquare({ className }: IconProps) {
  return <FontAwesomeIcon icon={faPenToSquare} className={className} />;
}

export function IconMicrophone({ className }: IconProps) {
  return <FontAwesomeIcon icon={faMicrophone} className={className} />;
}
