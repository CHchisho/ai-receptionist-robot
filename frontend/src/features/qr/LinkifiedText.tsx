import styles from "./LinkifiedText.module.css";

type Props = {
  text: string;
  onLinkClick: (url: string) => void;
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
export function LinkifiedText({ text, onLinkClick }: Props) {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
          return (
            <span
              key={`${part}-${index}`}
              className={styles.link}
              onClick={() => onLinkClick(part)}
              role="button"
              tabIndex={0}
            >
              {part}
            </span>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}