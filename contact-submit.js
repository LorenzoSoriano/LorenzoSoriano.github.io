const directContactForm = document.getElementById('direct-contact-form');

if (directContactForm) {
  const submitButton = directContactForm.querySelector('button[type="submit"]');
  const status = directContactForm.querySelector('.contact-status');

  directContactForm.addEventListener('submit', async event => {
    event.preventDefault();

    const recipient = directContactForm.dataset.recipient || '';
    const name = document.getElementById('contact-name')?.value.trim() || '';
    const email = document.getElementById('contact-email')?.value.trim() || '';
    const message = document.getElementById('contact-message')?.value.trim() || '';
    const lang = document.documentElement.lang === 'it' ? 'it' : 'en';

    if (!recipient || !name || !email || !message) return;

    submitButton.disabled = true;
    status.className = 'contact-status';
    status.textContent = lang === 'it' ? 'Invio in corso…' : 'Sending…';

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          message,
          _subject: lang === 'it' ? `Nuovo contatto portfolio da ${name}` : `New portfolio contact from ${name}`,
          _template: 'table',
          _url: window.location.href
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error('Submission failed');

      status.className = 'contact-status success';
      status.textContent = lang === 'it' ? 'Messaggio inviato. Grazie!' : 'Message sent. Thank you!';
      directContactForm.reset();
    } catch (error) {
      status.className = 'contact-status error';
      status.textContent = lang === 'it'
        ? 'Invio non riuscito. Riprova tra poco.'
        : 'Message could not be sent. Please try again.';
    } finally {
      submitButton.disabled = false;
    }
  });
}
