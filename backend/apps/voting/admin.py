from django.contrib import admin

from apps.voting.models import VoteBallot, VoteOption, VotePoll

admin.site.register(VotePoll)
admin.site.register(VoteOption)
admin.site.register(VoteBallot)
