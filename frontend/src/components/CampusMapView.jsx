import { Component, lazy, Suspense } from 'react';

const CampusMap = lazy(() => import('../campus/components/CampusMap'));
class MapBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="campus-page" role="alert">
      <h2>Campus map could not load</h2><p>Your timetable is still available. Return to it and reload the page when convenient.</p>
      <button onClick={this.props.onBack}>Back to timetable</button>
    </section>;
    return this.props.children;
  }
}

export default function CampusMapView(props) {
  return <MapBoundary onBack={props.onBack}>
    <Suspense fallback={<p role="status">Loading campus map…</p>}><CampusMap {...props}/></Suspense>
  </MapBoundary>;
}
