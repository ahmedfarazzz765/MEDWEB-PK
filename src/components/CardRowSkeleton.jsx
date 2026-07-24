import Skeleton from './Skeleton'

// Generic "row of skeleton cards" used while a carousel's Firestore listener
// hasn't returned its first snapshot yet. Matches the rough shape (width +
// height) of whatever real card will replace it, so there's no layout jump.
export default function CardRowSkeleton({ count = 4, cardWidth = 280, cardHeight = 280, gap = 20 }) {
  return (
    <div className="flex overflow-hidden" style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="flex-shrink-0" style={{ width: cardWidth, height: cardHeight }} />
      ))}
    </div>
  )
}
