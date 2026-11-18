export default function RouteSummary({ route, busy, error }) {
  if (busy) return <p role="status">Finding a walking route…</p>;
  if (error) return <p className="campus-warning" role="alert">{error}</p>;
  if (!route) return <div className="campus-empty"><h3>Where are you headed?</h3>
    <p>Choose two buildings or enter classroom codes to find a walking route.</p></div>;
  return <div className="campus-route-summary" role="status" aria-live="polite">
    <h3>{route.status === 'unavailable' ? 'Route unavailable' : route.status === 'same-building' ? 'Same building' :
      route.status === 'shared-approach' ? 'Shared campus approach' : 'Your walking route'}</h3>
    {['routed', 'shared-approach'].includes(route.status) ? <>
      <div className="campus-metrics"><strong>{route.minutes}<small>min estimated</small></strong>
        <strong>{route.distanceMeters}<small>meters estimated</small></strong></div>
      <div className="campus-route-badges">
        {route.usesNearbyApproach && <span>Uses a nearby approach</span>}
        {route.hasStairs && <span>Includes stairs</span>}
        {route.hasRoad && <span>Includes campus service roads</span>}
      </div>
      <ol className="campus-endpoints">
        <li><strong>{route.from.name}</strong><span>{route.fromEndpoint.description}</span></li>
        <li><strong>{route.to.name}</strong><span>{route.toEndpoint.description}</span></li>
      </ol>
      {route.status === 'shared-approach' && <p>{route.reason}</p>}
      {route.usesNearbyApproach && <p className="campus-warning">A nearby approach is not a confirmed entrance. The final entrance or floor connection is not mapped and is excluded from the distance. Follow campus signs.</p>}
      <p className="campus-muted">{route.status === 'routed' && 'Time includes a 2-minute planning buffer. '}Indoor room access, lift waits, slopes, and closures can add time.</p>
    </> : <p>{route.reason}</p>}
    {route.status === 'unavailable' && <p className="campus-muted">The building may be shown on the map even when its walking connection is missing. No straight-line substitute is used.</p>}
  </div>;
}
