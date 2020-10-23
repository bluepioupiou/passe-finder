<?php
$this->breadcrumbs=array(
	'Passes'=>array('index'),
	$model->name=>array('view','id'=>$model->id),
	'Mettre à jour',
);

?>

<h1>Mettre à jour la passe <?php echo $model->name; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>