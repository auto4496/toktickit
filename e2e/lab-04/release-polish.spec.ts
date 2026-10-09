import { expect, test } from '@playwright/test';
import { createTicket, expectNoHorizontalOverflow, requesterA } from '../lab-02/helpers';
import { loginAs } from './helpers';

test('RELEASE real role routes have no browser errors, broken API reads or hidden keyboard focus', async ({ page, request }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  let authenticatedRoute = false;
  page.on('pageerror', error => errors.push(error.message));
  // The unauthenticated session probe intentionally returns 401 before login.
  page.on('console', message => { if (authenticatedRoute && message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (authenticatedRoute && response.url().includes('/api/') && response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  const ticket = await createTicket(request, '[E2E-L4-RELEASE] Integrated polish and accessible routes');
  for (const [email, routes] of [
    [requesterA.email, ['/dashboard', '/tickets', '/tickets/new', `/tickets/${ticket.id}`]],
    ['e2e.staff@example.test', ['/staff/dashboard', '/staff/tickets', `/staff/tickets/${ticket.id}`]],
    ['e2e.admin@example.test', ['/admin/users', '/staff/dashboard', `/staff/tickets/${ticket.id}`]],
  ] as const) {
    authenticatedRoute = false;
    await loginAs(page, email, routes[0]);
    authenticatedRoute = true;
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/^Loading\b/i)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await page.keyboard.press('Tab');
      const focus = page.locator(':focus');
      await expect(focus).toBeVisible();
      const outline = await focus.evaluate(element => {
        const style = getComputedStyle(element);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, shadow: style.boxShadow };
      });
      expect(outline.width > 0 && outline.style !== 'none' || outline.shadow !== 'none').toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
