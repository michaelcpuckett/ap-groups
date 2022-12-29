import '../components/group-details';
import '../components/group-entity-details';
import '../components/actor-entity';
import '../components/request-entity';
import '../components/announce-entity';
import '../components/post-form';
import '../components/pagination-nav';
import { async } from '@firebase/util';

const flyoutElements = Array.from(window.document.querySelectorAll('.flyout-container'));
const buttonElements = Array.from(window.document.querySelectorAll('button[type="button"]'));
const loaderDialogElement = window.document.querySelector('#loader');

function assertIsDialogElement(element: unknown): asserts element is HTMLDialogElement {
  if (!(element instanceof HTMLDialogElement)) {
    throw new Error('Element is not an HTMLDialogElement');
  }
}

function assertIsDetailsElement(element: unknown): asserts element is HTMLDetailsElement {
  if (!(element instanceof HTMLDetailsElement)) {
    throw new Error('Element is not an HTMLDetailsElement');
  }
}

function assertIsNode(element: unknown): asserts element is Node {
  if (!(element instanceof Node)) {
    throw new Error('Element is not an Node');
  }
}

// Closes when loses focus.
flyoutElements.forEach((element) => {
  try {
    assertIsDetailsElement(element);
    
    element.addEventListener('focusout', async (event: FocusEvent) => {
      const target = event.target;

      // Prevent Chrome error when opening link.
      await new Promise(window.requestAnimationFrame);

      try {
        assertIsNode(target);

        if (!element.contains(target)) {
          return;
        }

        element.open = false;
      } catch (error) {
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
});

function showLoader() {
  assertIsDialogElement(loaderDialogElement);
  loaderDialogElement.showModal();
}

function logout() {
  var cookies = document.cookie.split("; ");
  for (var c = 0; c < cookies.length; c++) {
      var d = window.location.hostname.split(".");
      while (d.length > 0) {
          var cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
          var p = location.pathname.split('/');
          document.cookie = cookieBase + '/';
          while (p.length > 0) {
              document.cookie = cookieBase + p.join('/');
              p.pop();
          };
          d.shift();
      }
  }
  window.location.reload();
}

function deleteGroup(actorId: string) {
  showLoader();

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
      case 'delete-group': {
        deleteGroup(buttonElement.dataset.entityId);
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

    showLoader();

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

      showLoader();

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

window.document.querySelector('#blocked')?.addEventListener('click', (event: Event) => {
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

      showLoader();

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

      showLoader();

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

      showLoader();

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

      showLoader();
      
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

