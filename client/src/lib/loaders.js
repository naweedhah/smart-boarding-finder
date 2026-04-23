import { defer } from "react-router-dom";
import apiRequest from "./apiRequest";

export const singlePageLoader = async ({ params }) => {
  const res = await apiRequest("/posts/" + params.id);
  return res.data;
};
export const listPageLoader = async ({ request }) => {
  const query = request.url.split("?")[1];
  const postPromise = apiRequest("/posts?" + query);
  const demandPromise = apiRequest("/posts/demand/overview");
  return defer({
    postResponse: postPromise,
    demandResponse: demandPromise,
  });
};

export const profilePageLoader = async () => {
  const postPromise = apiRequest("/users/profilePosts")
    .catch(() => ({ data: { userPosts: [], savedPosts: [], pendingBookings: [] } }));
  const chatPromise = apiRequest("/chats")
    .catch(() => ({ data: [] }));
  const searchAlertPromise = apiRequest("/users/watchlists/searches")
    .catch(() => ({ data: [] }));
  const preferencePromise = apiRequest("/users/notifications/preferences")
    .catch(() => ({ data: null }));
  return defer({
    postResponse: postPromise,
    chatResponse: chatPromise,
    searchAlertResponse: searchAlertPromise,
    preferenceResponse: preferencePromise,
  });
};

export const watchlistPageLoader = async () => {
  const postPromise = apiRequest("/users/profilePosts");
  const searchAlertPromise = apiRequest("/users/watchlists/searches");
  const preferencePromise = apiRequest("/users/notifications/preferences");
  return defer({
    postResponse: postPromise,
    searchAlertResponse: searchAlertPromise,
    preferenceResponse: preferencePromise,
  });
};

export const roommatePageLoader = async () => {
  const profilePromise = apiRequest("/users/roommate-profile");
  const matchesPromise = apiRequest("/users/roommate-matches");

  return defer({
    profileResponse: profilePromise,
    matchesResponse: matchesPromise,
  });
};
