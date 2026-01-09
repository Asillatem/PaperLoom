import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ItemSelectionPage } from './pages/ItemSelectionPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { LibraryPage } from './pages/LibraryPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/project/:projectId/items',
    element: <ItemSelectionPage />,
  },
  {
    path: '/project/:projectId/workspace',
    element: <WorkspacePage />,
  },
  {
    path: '/library',
    element: <LibraryPage />,
  },
]);
