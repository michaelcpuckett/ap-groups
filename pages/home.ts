import '../components/group-details';
import '../components/actor-entity';
import '../components/request-entity';
import '../components/block-entity';
import '../components/announce-entity';
import '../components/post-form';

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