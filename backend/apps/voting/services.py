from django.utils import timezone

from apps.audit.services import log_activity
from apps.voting.models import VoteBallot, VotePoll


def can_vote(user, poll: VotePoll) -> bool:
    if poll.status != VotePoll.Status.ACTIVE:
        return False
    now = timezone.now()
    if poll.starts_at > now or poll.ends_at < now:
        return False
    eligible = poll.eligible_users.exists()
    if eligible:
        return poll.eligible_users.filter(pk=user.pk).exists()
    return user.is_authenticated


def cast_vote(*, poll: VotePoll, user, option_ids: list[int]):
    if VoteBallot.objects.filter(poll=poll, voter=user).exists():
        raise ValueError("Użytkownik już głosował.")
    ballots = []
    for option in poll.options.filter(id__in=option_ids):
        ballots.append(VoteBallot.objects.create(poll=poll, voter=user, option=option))
    log_activity(
        user=user,
        action_type="poll.voted",
        entity_type="poll",
        entity_id=poll.id,
        description=f"Oddano głos w ankiecie {poll.title}.",
        metadata={"options": option_ids},
    )
    return ballots


def close_poll(poll: VotePoll, user=None):
    poll.status = VotePoll.Status.CLOSED
    poll.save(update_fields=["status", "updated_at"])
    log_activity(
        user=user,
        action_type="poll.closed",
        entity_type="poll",
        entity_id=poll.id,
        description=f"Zamknięto głosowanie {poll.title}.",
    )
    return poll


def build_results(poll: VotePoll):
    total_votes = VoteBallot.objects.filter(poll=poll).values("voter").distinct().count()
    option_counts = {option.label: option.ballots.count() for option in poll.options.all()}
    return {
        "poll_id": poll.id,
        "total_voters": total_votes,
        "quorum_required": poll.quorum_required,
        "quorum_met": total_votes >= poll.quorum_required,
        "options": option_counts,
    }

