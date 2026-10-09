/* Profile links and fallback stats. null means not set.
   stats.js supplies automatically refreshed LetsDefend / HTB / KC7 values.
   Optional progress uses completed / total, e.g. { completed: 25, total: 100 }.
   Add your photo to assets/ and set portrait.src to its relative path. */
window.PORTFOLIO_CONTENT = {
  portrait: { src: 'assets/brandon.jpg', alt: 'Brandon Chaney' },
  platforms: {
    letsdefend: {
      profileUrl: 'https://app.letsdefend.io/user/bchaney',
      metrics: [24, 2], // Investigations, paths completed
      status: 'Updated Oct 3',
      progress: null,
    },
    htb: {
      profileUrl: 'https://app.hackthebox.com/users/3476736?profile-top-tab=machines&ownership-period=1M&profile-bottom-tab=prolabs',
      metrics: [5, 9], // Machines solved, Sherlocks completed
      progress: null,
    },
    kc7: {
      profileUrl: 'https://kc7cyber.com/profile/281dc195',
      metrics: [3, 3], // Games minus counted courses, earned course badges
      progress: null,
    },
    portswigger: {
      profileUrl: null,
      metrics: [null, null], // Labs completed, topics completed
      progress: null,
    },
  },
};
