import '../components/group-details';
import '../components/group-entity-details';
import '../components/actor-entity';
import '../components/request-entity';
import '../components/announce-entity';
import '../components/post-form';
import '../components/pagination-nav';

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

const addAdministratorForm = window.document.querySelector('#add-administrator-form');

if (addAdministratorForm) {
  addAdministratorForm.addEventListener('input', () => {
    addAdministratorForm.classList.remove('has-error');
  });

  addAdministratorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = addAdministratorForm.querySelector<HTMLInputElement>('[name="email"]')?.value;
    const emailConfirm = addAdministratorForm.querySelector<HTMLInputElement>('[name="email-confirm"]')?.value;

    if (!email) {
      addAdministratorForm.classList.add('has-error');
      const errorMessage = addAdministratorForm.querySelector('[name="email"]').parentElement.querySelector('.error-message');
      errorMessage.textContent = 'Required';
      return;
    }

    if (email !== emailConfirm) {
      addAdministratorForm.classList.add('has-error');
      const errorMessage = addAdministratorForm.querySelector('[name="email"]').closest('label').querySelector('.error-message');
      errorMessage.textContent = 'Fields don\'t match.';
      return;
    }

    fetch(`/user/admin`, {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    })
    .then(res => res.json())
    .then((result) => {
      if (result.success) {
        window.location.reload();
      } else {
        addAdministratorForm.classList.add('has-error');
        const errorMessage = addAdministratorForm.querySelector('[name="email"]').closest('label').querySelector('.error-message');
        errorMessage.textContent = result.error;
      }
    });
  });
}


window.document.querySelector('#members')?.addEventListener('click', (event: Event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;

  if (!action) {
    return;
  }

  const entityId = target.dataset.entityId;
  const actorId = target.dataset.actorId;

  switch (action) {
    case 'block': {
      if (!entityId || !actorId) {
        return;
      }

      fetch(`${actorId}/outbox`, {
        method: 'POST',
        headers: {
          'Accept': 'application/activity+json',
        },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Block',
          actor: actorId,
          object: entityId,
        }),
      }).then(res => {
        if (res.headers.has('Location')) {
          window.location.reload();
        }
      });
    };
    break;
    default: {

    };
    break;
  }
});


window.document.querySelector('#blocks')?.addEventListener('click', (event: Event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;

  if (!action) {
    return;
  }

  const entityId = target.dataset.entityId;
  const actorId = target.dataset.actorId;

  switch (action) {
    case 'unblock': {
      if (!entityId || !actorId) {
        return;
      }

      fetch(`${actorId}/outbox`, {
        method: 'POST',
        headers: {
          'Accept': 'application/activity+json',
        },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Undo',
          actor: actorId,
          object: entityId,
        }),
      }).then(res => {
        if (res.headers.has('Location')) {
          window.location.reload();
        }
      });
    };
    break;
    default: {

    };
    break;
  }
});
window.document.querySelector('#requests')?.addEventListener('click', (event: Event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;

  if (!action) {
    return;
  }

  const entityId = target.dataset.entityId;
  const actorId = target.dataset.actorId;

  switch (action) {
    case 'accept': {
      if (!entityId || !actorId) {
        return;
      }

      fetch(`${actorId}/outbox`, {
        method: 'POST',
        headers: {
          'Accept': 'application/activity+json',
        },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Accept',
          actor: actorId,
          object: entityId,
        }),
      }).then(res => {
        if (res.headers.has('Location')) {
          window.location.reload();
        }
      });
    };
    break;
    case 'block': {
      if (!entityId || !actorId) {
        return;
      }

      fetch(`${actorId}/outbox`, {
        method: 'POST',
        headers: {
          'Accept': 'application/activity+json',
        },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Block',
          actor: actorId,
          object: entityId,
        }),
      }).then(res => {
        if (res.headers.has('Location')) {
          window.location.reload();
        }
      });
    };
    default: {

    };
    break;
  }
});


window.document.querySelector('#posts')?.addEventListener('click', (event: Event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;

  if (!action) {
    return;
  }

  const entityId = target.dataset.entityId;
  const actorId = target.dataset.actorId;

  switch (action) {
    case 'undo-announce': {
      if (!entityId || !actorId) {
        return;
      }
      
      fetch(`${actorId}/outbox`, {
        method: 'POST',
        headers: {
          'Accept': 'application/activity+json',
        },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Undo',
          actor: `${actorId}`,
          object: entityId,
          to: [
            'https://www.w3.org/ns/activitystreams#Public',
            `${actorId}/followers`,
          ],
        }),
      }).then(res => {
        if (res.headers.has('Location')) {
          window.location.reload();
        }
      });
    }
    break;
    default: {

    }
    break;
  }
});

const tabsElement = window.document.querySelector('.tabs');
const tabsScrollableElement = tabsElement.querySelector<HTMLElement>('.tabs-box');
const tabsScrollLeftButton = tabsElement.querySelector('[rel="prev"]');
const tabsScrollRightButton = tabsElement.querySelector('[rel="next"]');

tabsScrollLeftButton.addEventListener('click', () => {
  tabsScrollableElement.scrollTo({
    left: 0,
    top: 0,
  });
});

tabsScrollRightButton.addEventListener('click', () => {
  tabsScrollableElement.scrollTo({
    left: tabsScrollableElement.scrollWidth,
    top: 0,
  });
});

const determineTabBoundary = () => {
  const { scrollLeft, scrollWidth, offsetWidth } = tabsScrollableElement;

  if (scrollWidth > offsetWidth) {
    if (scrollLeft > ((scrollWidth - offsetWidth) / 2)) {
      tabsScrollLeftButton.removeAttribute('hidden');
      tabsScrollRightButton.setAttribute('hidden', '');
    } else {
      tabsScrollLeftButton.setAttribute('hidden', '');
      tabsScrollRightButton.removeAttribute('hidden');
    }

    tabsScrollableElement.addEventListener('scroll', () => {
      const { scrollLeft, scrollWidth, offsetWidth } = tabsScrollableElement;

      if (scrollLeft > ((scrollWidth - offsetWidth) / 2)) {
        tabsScrollLeftButton.removeAttribute('hidden');
        tabsScrollRightButton.setAttribute('hidden', '');
      } else {
        tabsScrollLeftButton.setAttribute('hidden', '');
        tabsScrollRightButton.removeAttribute('hidden');
      }
    });
  } else {
    tabsScrollLeftButton.setAttribute('hidden', '');
    tabsScrollRightButton.setAttribute('hidden', '');
  }
};

determineTabBoundary();
window.addEventListener('resize', determineTabBoundary);