<?php

namespace Tests\Unit;

use App\Models\Menage;
use App\Models\User;
use App\Policies\MenagePolicy;
use Tests\TestCase;

class MenagePolicyTest extends TestCase
{
    public function test_provincial_and_communal_supervisors_can_manage_associated_data_only(): void
    {
        $policy = new MenagePolicy;
        $menage = new Menage;
        $menage->source = 'pre_enregistre';

        foreach (['superviseur_provincial', 'superviseur_communal'] as $role) {
            $superviseur = new User;
            $superviseur->role = $role;

            $this->assertTrue($policy->updateReponse($superviseur, $menage));
            $this->assertTrue($policy->deleteParcelle($superviseur, $menage));
            $this->assertTrue($policy->deleteReponse($superviseur, $menage));
            $this->assertFalse($policy->update($superviseur, $menage));
            $this->assertFalse($policy->delete($superviseur, $menage));
        }
    }

    public function test_national_supervisor_keeps_terrain_only_related_data_permissions(): void
    {
        $policy = new MenagePolicy;
        $superviseur = new User;
        $superviseur->role = 'superviseur_national';
        $menage = new Menage;

        $menage->source = 'pre_enregistre';
        $this->assertFalse($policy->updateReponse($superviseur, $menage));
        $this->assertFalse($policy->deleteParcelle($superviseur, $menage));
        $this->assertFalse($policy->deleteReponse($superviseur, $menage));

        $menage->source = 'terrain';
        $this->assertTrue($policy->updateReponse($superviseur, $menage));
        $this->assertTrue($policy->deleteParcelle($superviseur, $menage));
        $this->assertTrue($policy->deleteReponse($superviseur, $menage));
    }
}
