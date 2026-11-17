<?php

namespace Tests\Unit;

use App\Models\User;
use App\Policies\UserPolicy;
use Tests\TestCase;

class UserPolicyTest extends TestCase
{
    public function test_provincial_supervisor_cannot_edit_a_peer_role_missing_from_the_form(): void
    {
        $superviseur = new User;
        $superviseur->role = 'superviseur_provincial';
        $superviseur->province_id = 1;

        $cible = new User;
        $cible->role = 'superviseur_provincial';
        $cible->province_id = 1;

        $this->assertFalse((new UserPolicy)->update($superviseur, $cible));
    }

    public function test_communal_supervisor_cannot_edit_a_communal_peer_as_an_enqueteur(): void
    {
        $superviseur = new User;
        $superviseur->role = 'superviseur_communal';

        $cible = new User;
        $cible->role = 'superviseur_communal';

        $this->assertFalse((new UserPolicy)->update($superviseur, $cible));
    }
}
