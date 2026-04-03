import HomePage from "./routes/homePage/homePage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ListPage from "./routes/listPage/listPage";
import { Layout, RequireAuth } from "./routes/layout/layout";
import SinglePage from "./routes/singlePage/singlePage";
import ProfilePage from "./routes/profilePage/profilePage";
import Login from "./features/auth/pages/login";
import Register from "./features/auth/pages/register";
import ProfileUpdatePage from "./routes/profileUpdatePage/profileUpdatePage";
import NewPostPage from "./routes/newPostPage/newPostPage";
import {
  listPageLoader,
  profilePageLoader,
  roommatePageLoader,
  singlePageLoader,
  watchlistPageLoader,
} from "./lib/loaders";
import WatchlistPage from "./features/watchlist/pages/watchlistPage";
import RoommatePage from "./features/roommate/pages/roommatePage";
import InquiryBox from "./features/sakith/components/InquiryBox";
import AdminDashboard from "./features/sakith/pages/AdminDashboard";


function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "/",
          element: <HomePage />,
        },
        {
          path: "/list",
          element: <ListPage />,
          loader: listPageLoader,
        },
        {
          path: "/:id",
          element: <SinglePage />,
          loader: singlePageLoader,
        },

        {
          path: "/login",
          element: <Login />,
        },
        {
          path: "/register",
          element: <Register />,
        },
      ],
    },
    {
      path: "/",
      element: <RequireAuth />,
      children: [
        {
          path: "/profile",
          element: <ProfilePage />,
          loader: profilePageLoader
        },
        {
          path: "/watchlist",
          element: <WatchlistPage />,
          loader: watchlistPageLoader,
        },
        {
          path: "/roommates",
          element: <RoommatePage />,
          loader: roommatePageLoader,
        },
        {
          path: "/profile/update",
          element: <ProfileUpdatePage />,
        },
        {
          path: "/add",
          element: <NewPostPage />,
        },
          {
          path: "/sakith/inquiry",
          element: <InquiryBox />
         },
        {
           path: "/sakith/admin",
          element: <AdminDashboard />
        }
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
