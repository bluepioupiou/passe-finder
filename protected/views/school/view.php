<?php
$this->breadcrumbs=array(
	'Ecoles'=>array('index'),
	$model->name,
);

$this->menu=array(
	array('label'=>'Modifier', 'url'=>array('update', 'id'=>$model->id), 'visible'=>$model->userManager_id==Yii::app()->user->id),
	array('label'=>'Ajouter un cours', 'url'=>array('lesson/create', 'school_id'=>$model->id), 'visible'=>$model->userManager_id==Yii::app()->user->id&&$model->pending==0),	
);
?>

<h1>Fiche de l'école : <?php echo $model->name; ?></h1>

<?php 
	if ($model->pending){
?>
	<span class="alert i_warning">
		Cette école n'a pas encore été validée par l'administrateur. <br />
		Impossible pour le moment de créer de cours et d'affecter de professeurs
	</span>
<?php

	}
	$this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		'adress',
		'postal_code',
		'city',
		'url',
		array('name'=>'userManager_id', 'value'=>$model->userManager->username),
		array('name' =>'private','value'=>$model->private ? 'Oui' : 'Non'),
	),
)); ?>
<br/>Message de l'école : <br/>
<span class="alert i_info"><?php echo $model->comment; ?></span>

<br /><br />
	<div> Cours de cette école (<?php echo $model->lessonsCount; ?>):
	<br /><ul>
<?php
	foreach($model->lessons as $lesson){
		echo '<li>'.CHtml::link(CHtml::encode($lesson->name), array('lesson/view', 'id'=>$lesson->id)).'</li>';
	}
?>
	</ul>
	</div>
