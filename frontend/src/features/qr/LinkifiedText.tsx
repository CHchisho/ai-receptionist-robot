import { LinkChip } from "@/features/qr/LinkChip";

type Props = {
  text: string;
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({ text }: Props) {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
          return <LinkChip key={`${part}-${index}`} url={part} label={part} />;
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}
