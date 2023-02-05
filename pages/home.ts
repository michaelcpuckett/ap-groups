import '../components/group-details';
import '../components/group-entity-details';
import '../components/actor-entity';
import '../components/request-entity';
import '../components/announce-entity';
import '../components/post-form';
import '../components/pagination-nav';

const detailsElements = Array.from(window.document.querySelectorAll('details'));
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

function assertIsHTMLElement(element: unknown): asserts element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    throw new Error('Element is not an HTMLElement');
  }
}

function assertIsNode(element: unknown): asserts element is Node {
  if (!(element instanceof Node)) {
    throw new Error('Element is not an Node');
  }
}

// Closes when loses focus.
detailsElements.forEach((detailsElement) => {
  const summaryElement = detailsElement.querySelector('summary');

  try {
    assertIsDetailsElement(detailsElement);
    assertIsHTMLElement(summaryElement);

    detailsElement.addEventListener('keyup', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        summaryElement.focus();
        detailsElement.open = false;
      }
    });

    detailsElement.addEventListener('focusout', async ({ relatedTarget }: FocusEvent) => {
      // Fix Safari issue
      await new Promise(window.requestAnimationFrame);

      if (!relatedTarget) {
        summaryElement.focus();
        detailsElement.open = false;
        return;
      }

      try {
        assertIsNode(relatedTarget);

        if (relatedTarget.getRootNode() !== window.document.documentElement) {
          let target = relatedTarget;

          while (target !== window.document.documentElement) {
            try {
              assertIsNode(target);

              if (!detailsElement.contains(target)) {
                const rootNode = target.getRootNode();
                
                if (rootNode instanceof ShadowRoot) {
                  target = rootNode.host;
                } else {
                  target = rootNode;
                }

                break;
              }

              return;
            } catch (error) {
              console.log(error);
              break;
            }

          }

          detailsElement.open = false;
        }

        try {
          assertIsNode(relatedTarget);

          if (!detailsElement.contains(relatedTarget)) {
            return;
          }

          detailsElement.open = false;
        } catch (error) {
          console.log(error);
        }
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
const announcementForm = window.document.querySelector('#announcement-form');

if (announcementForm) {
  announcementForm.addEventListener('input', () => {
    announcementForm.classList.remove('has-error');
  });

  announcementForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const actorId = announcementForm.querySelector<HTMLInputElement>('[name="actor-id"]')?.value;

    if (!actorId) {
      return;
    }

    const content = announcementForm.querySelector<HTMLInputElement>('[name="announcement"]')?.value;

    if (!content) {
      announcementForm.classList.add('has-error');
      const errorMessage = announcementForm.querySelector('[name="announcement"]').parentElement.querySelector('.error-message');
      errorMessage.textContent = 'Required';
      return;
    }

    showLoader();

    fetch(`${actorId}/outbox`, {
      method: 'POST',
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Create',
        actor: actorId,
        to: [
          'https://www.w3.org/ns/activitystreams#Public',
          `${actorId}/followers`
        ],
        object: {
          type: 'Note',
          content,
        },
      }),
    })
    .then((res) => {
      if (res.headers.get('Location')) {
        window.location.reload();
      } else {
        console.log('Error');
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
  const entityActorId = target.dataset.entityActorId;

  switch (action) {
    case 'accept': {
      if (!entityId || !actorId || !entityActorId) {
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
          to: [entityActorId],
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

