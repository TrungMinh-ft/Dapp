type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: SectionTitleProps) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      {eyebrow ? (
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.4em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-heading text-3xl uppercase tracking-[0.18em] text-white lg:text-5xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 max-w-3xl text-lg text-copy">{subtitle}</p> : null}
    </div>
  );
}
