import { useEffect, useRef, useState } from 'react';
import { Button, Chip } from '@nextui-org/react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Event {
  id: string;
  description: string;
  involved_characters: string[];
  locations: string[];
  importance: number;
}

interface ActionTimelineProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export default function ActionTimeline({ events, onEventClick }: ActionTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      const newPosition = direction === 'left'
        ? scrollPosition - scrollAmount
        : scrollPosition + scrollAmount;

      scrollRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  useEffect(() => {
    const handleScrollEvent = () => {
      if (scrollRef.current) {
        setScrollPosition(scrollRef.current.scrollLeft);
      }
    };

    const ref = scrollRef.current;
    ref?.addEventListener('scroll', handleScrollEvent);
    return () => ref?.removeEventListener('scroll', handleScrollEvent);
  }, []);

  if (events.length === 0) {
    return (
      <div style={{
        height: '120px',
        background: 'white',
        borderTop: '2px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999'
      }}>
        No events to display
      </div>
    );
  }

  return (
    <div style={{
      height: '120px',
      background: 'white',
      borderTop: '2px solid #ddd',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid #eee',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
          Event Timeline ({events.length} events)
        </span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <Button
            size="sm"
            isIconOnly
            variant="flat"
            onClick={() => handleScroll('left')}
          >
            <FaChevronLeft />
          </Button>
          <Button
            size="sm"
            isIconOnly
            variant="flat"
            onClick={() => handleScroll('right')}
          >
            <FaChevronRight />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '10px 20px',
          overflowX: 'auto',
          overflowY: 'hidden'
        }}
      >
        {events.map((event, idx) => (
          <div
            key={event.id}
            onClick={() => onEventClick?.(event)}
            style={{
              minWidth: '200px',
              height: '60px',
              background: '#f9fafb',
              border: '2px solid #667eea',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {idx + 1}. {event.description}
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {event.involved_characters.slice(0, 2).map((char, i) => (
                <Chip key={i} size="sm" variant="flat" color="secondary" style={{ fontSize: '10px' }}>
                  {char}
                </Chip>
              ))}
              {event.involved_characters.length > 2 && (
                <Chip size="sm" variant="flat" color="default" style={{ fontSize: '10px' }}>
                  +{event.involved_characters.length - 2}
                </Chip>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
