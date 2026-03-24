export function SectionPanel({ eyebrow, title, subtitle, action, children, accent = 'blue' }) {
  return (
    <section className={`panel panel-${accent}`}>
      <div className="panel-head">
        <div>
          {eyebrow ? <p className="panel-eyebrow">{eyebrow}</p> : null}
          <h3 className="panel-title">{title}</h3>
          {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  );
}
