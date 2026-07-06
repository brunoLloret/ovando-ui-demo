import type { RoomsState } from "../roomsState";
import styles from "./rooms.module.css";

export interface BibleRoomProps {
  bible: RoomsState["bible"];
}

/** Station 6: cast, record & the finished work. */
export function BibleRoom({ bible }: BibleRoomProps) {
  return (
    <div className={styles.room}>
      <div className={styles.title}>First Bible — cast, record &amp; the finished work</div>
      {!bible.work && !bible.cast ? (
        <div className={styles.muted}>The finished work appears here when you Generate.</div>
      ) : (
        <>
          {bible.cast && bible.cast.length > 0 && (
            <div className={styles.chips} style={{ marginBottom: 12 }}>
              {bible.cast.map((c) => (
                <span key={c.name} className={styles.chip}>
                  {c.name}
                </span>
              ))}
            </div>
          )}
          {bible.work && <div className={styles.work}>{bible.work}</div>}
        </>
      )}
    </div>
  );
}
