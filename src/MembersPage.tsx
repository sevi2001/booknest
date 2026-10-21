import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Search, Pencil, Trash2, X, Users } from 'lucide-react';
import { readLoans } from './loanStore';

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
};

type MemberForm = {
  name: string;
  email: string;
  phone: string;
};

const STORAGE_KEY = 'booknest-members-v1';

function isMember(value: unknown): value is Member {
  if (typeof value !== 'object' || value === null) return false;

  const member = value as Record<string, unknown>;

  return (
    typeof member.id === 'string' &&
    typeof member.name === 'string' &&
    typeof member.email === 'string' &&
    typeof member.phone === 'string' &&
    typeof member.joinedAt === 'string' &&
    !Number.isNaN(Date.parse(member.joinedAt))
  );
}

function loadMembers(): Member[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === null) return [];

    const parsed: unknown = JSON.parse(saved);

    if (Array.isArray(parsed) && parsed.every(isMember)) {
      return parsed;
    }
  } catch {
    // The page starts with an empty list if storage cannot be read.
  }

  return [];
}

function emptyForm(): MemberForm {
  return {
    name: '',
    email: '',
    phone: '',
  };
}

function MembersPage() {
  const [members, setMembers] = useState<Member[]>(loadMembers);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (formOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [formOpen]);

  function saveMembers(nextMembers: Member[], successMessage: string) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMembers));
      setMembers(nextMembers);
      setMessage(successMessage);
      return true;
    } catch {
      setMessage('Could not save changes. Please check browser storage.');
      return false;
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  }

  function openEditForm(member: Member) {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
    });
    setFormError('');
    setFormOpen(true);
  }

  function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedForm: MemberForm = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    };

    if (!cleanedForm.name) {
      setFormError('Enter the member’s name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedForm.email)) {
      setFormError('Enter a valid email address.');
      return;
    }

    const phoneDigits = cleanedForm.phone.replace(/\D/g, '');

    if (
      !/^\+?[\d\s()-]+$/.test(cleanedForm.phone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      setFormError('Enter a valid phone number with 7 to 15 digits.');
      return;
    }

    const emailExists = members.some(
      (member) =>
        member.id !== editingId &&
        member.email.toLowerCase() === cleanedForm.email,
    );

    if (emailExists) {
      setFormError('A member with this email already exists.');
      return;
    }

    const nextMembers = editingId
      ? members.map((member) =>
          member.id === editingId
            ? { ...member, ...cleanedForm }
            : member,
        )
      : [
          ...members,
          {
            ...cleanedForm,
            id: crypto.randomUUID(),
            joinedAt: new Date().toISOString(),
          },
        ];

    const saved = saveMembers(
      nextMembers,
      editingId
        ? 'Member updated successfully.'
        : 'Member added successfully.',
    );

    if (saved) {
      setSearch('');
      setFormOpen(false);
    } else {
      setFormError('The member could not be saved. Please try again.');
    }
  }

  function deleteMember(member: Member) {
    if (!window.confirm(`Delete member "${member.name}"?`)) return;
        try {
      const hasActiveLoans = readLoans().some(
        (loan) =>
          loan.memberId === member.id && loan.returnedOn === null,
      );

      if (hasActiveLoans) {
        setMessage('Return this member’s borrowed books before deleting them.');
        return;
      }
    } catch {
      setMessage('Could not check loan records. Member was not deleted.');
      return;
    }

    saveMembers(
      members.filter((item) => item.id !== member.id),
      'Member deleted successfully.',
    );
  }

  const query = search.trim().toLowerCase();

  const filteredMembers = members.filter((member) =>
    [member.name, member.email, member.phone, member.id].some((value) =>
      value.toLowerCase().includes(query),
    ),
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LIBRARY COMMUNITY</p>
          <h1>Members</h1>
          <p>Manage library members and their contact details.</p>
        </div>

        <button
          className="primary-button icon-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Member
        </button>
      </div>

      <p className="demo-notice">
        Members are saved in this browser. Loan tracking will be connected
        in a later step.
      </p>

      {message && (
        <div className="catalogue-message" role="status">
          {message}
        </div>
      )}

      <div className="members-search">
        <div className="search-field">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search members"
            placeholder="Search by name, email, phone or member ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="catalogue-summary">
        <span>
          Showing {filteredMembers.length} of {members.length} members
        </span>

        <button
          className="text-button"
          onClick={() => setSearch('')}
        >
          Clear search
        </button>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h2>Library Members</h2>
          <span className="badge badge-green">
            {members.length} members
          </span>
        </div>

        {filteredMembers.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-name-cell">
                        <span className="member-avatar" aria-hidden="true">
                          {member.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()}
                        </span>

                        <span className="book-title">{member.name}</span>
                      </div>
                    </td>

                    <td>{member.email}</td>
                    <td className="member-phone">{member.phone}</td>
                    <td className="member-date">
                      {new Date(member.joinedAt).toLocaleDateString(
                        'en-GB',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}
                    </td>

                    <td>
                      <div className="member-actions">
                        <button
                          className="secondary-button icon-button"
                          aria-label={`Edit ${member.name}`}
                          onClick={() => openEditForm(member)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          className="danger-button icon-button"
                          aria-label={`Delete ${member.name}`}
                          onClick={() => deleteMember(member)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="catalogue-empty">
            <Users size={38} />
            <h2>
              {members.length === 0
                ? 'No members yet'
                : 'No matching members'}
            </h2>
            <p>
              {members.length === 0
                ? 'Click Add Member to register your first member.'
                : 'Try searching with a different name or email.'}
            </p>
          </div>
        )}
      </section>

      {formOpen && (
        <dialog
          ref={dialogRef}
          className="book-dialog"
          aria-labelledby="member-form-title"
          onCancel={() => setFormOpen(false)}
          onClose={() => setFormOpen(false)}
        >
          <div className="dialog-heading">
            <h2 id="member-form-title">
              {editingId ? 'Edit Member' : 'Add Member'}
            </h2>

            <button
              type="button"
              className="dialog-close"
              aria-label="Close member form"
              onClick={() => setFormOpen(false)}
            >
              <X size={22} />
            </button>
          </div>

          <form className="book-form" onSubmit={submitMember}>
            <label>
              Full Name
              <input
                required
                autoFocus
                autoComplete="name"
                maxLength={100}
                placeholder="Example: Amal Perera"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>

            <label>
              Email Address
              <input
                required
                type="email"
                autoComplete="email"
                maxLength={150}
                placeholder="Example: amal@example.com"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>

            <label>
              Phone Number
              <input
                required
                type="tel"
                autoComplete="tel"
                maxLength={25}
                placeholder="Example: 077 123 4567"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </label>

            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>

              <button type="submit" className="primary-button">
                {editingId ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

export default MembersPage;