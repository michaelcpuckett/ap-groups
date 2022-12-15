import '../components/group-details';
import '../components/actor-entity';
import '../components/request-entity';
import '../components/block-entity';
import '../components/announce-entity';

const buttonElements = Array.from(window.document.querySelectorAll('button[type="button"]'));

function logout() {
  const cookies = window.document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.slice(0, eqPos) : cookie;
    window.document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  window.location.reload();
}

function deleteGroup(actorId: string) {
  fetch(`${actorId}/outbox`, {
    method: 'POST',
    headers: {
      'Accept': 'application/activity+json',
    },
    body: JSON.stringify({
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Delete',
      actor: actorId,
      object: actorId,
      to: [
        'https://www.w3.org/ns/activitystreams#Public',
        `${actorId}/followers`,
      ],
    }),
  })
  .then((res) => {
    if (res.headers.has('Location')) {
      window.location.reload();
    }
  }).catch((error: unknown) => {
    console.log('error', error);
  });
}


for (const buttonElement of buttonElements) {
  if (!(buttonElement instanceof HTMLElement)) {
    continue;
  }

  buttonElement.addEventListener('click', () => {
    switch (buttonElement.dataset.action) {
      case 'logout': {
        logout();
      }
      break;
      case 'delete': {
        deleteGroup(buttonElement.dataset.id);
      }
      default: {}
      break;
    }
  });
}